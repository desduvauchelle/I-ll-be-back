'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type Ref } from 'react'
import { flushSync } from 'react-dom'
import {
	RANKS,
	SUIT_SYMBOLS,
	chooseComputerPlay,
	createDeck,
	isLegalPlay,
	rankValue,
	shuffle,
	sortHand,
	type PlayingCard,
	type Rank,
} from '@/lib/card-game'

type Player = 'human' | 'cpu'
type Phase = 'playing' | 'exchange' | 'game-over'
type OnboardingMode = 'checking' | 'prompt' | 'briefing' | 'guided' | 'complete' | 'off'
type FeedbackSide = Player | 'center'
type FeedbackTone = 'impact' | 'warning' | 'move'

const ONBOARDING_STORAGE_KEY = 'ill-be-back:onboarding:v1'

interface ViewTransitionDocument {
	startViewTransition?: (update: () => void) => unknown
}

function animateTableUpdate(update: () => void) {
	const transitionDocument = document as unknown as ViewTransitionDocument
	if (!transitionDocument.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
		update()
		return
	}
	transitionDocument.startViewTransition(() => flushSync(update))
}

interface GameState {
	human: PlayingCard[]
	cpu: PlayingCard[]
	drawPile: PlayingCard[]
	recycle: PlayingCard[]
	activeRank: Rank | null
	activeCards: PlayingCard[]
	lastSuccessful: Player | null
	turn: Player
	phase: Phase
	humanHasDrawn: boolean
	awaitingDecision: boolean
	forcedContinuation: boolean
	winner: Player | null
	loser: Player | null
	gameNumber: number
	humanWins: number
	cpuWins: number
	starterNote: string
	log: string[]
}

interface FeedbackCue {
	side: FeedbackSide
	tone: FeedbackTone
	label: string
	title: string
	detail: string
}

interface TableFeedback extends FeedbackCue {
	id: number
}

interface DrawAnimation {
	id: number
	player: Player
	count: number
}

interface ComputerTurnStep {
	wait: number
	state: GameState
	cue: FeedbackCue
	drawCount?: number
}

const otherPlayer = (player: Player): Player => player === 'human' ? 'cpu' : 'human'
const playerName = (player: Player): string => player === 'human' ? 'You' : 'The Machine'

function countName(count: number): string {
	if (count === 1) return 'SINGLE'
	if (count === 2) return 'PAIR'
	if (count === 3) return 'TRIPLE'
	if (count === 4) return 'FOUR OF A KIND'
	return `${count}-CARD LEVEL`
}

function levelUpCue(player: Player, rank: Rank, previousCount: number, nextCount: number): FeedbackCue {
	return {
		side: 'center',
		tone: 'impact',
		label: `COUNT LEVEL ${previousCount} → ${nextCount}`,
		title: player === 'human' ? 'BAM. I’LL BE BACK.' : 'COUNT LEVEL UP.',
		detail: `${countName(nextCount)} OF ${rank}s LOCKED. ${playerName(otherPlayer(player)).toUpperCase()} MUST ANSWER WITH ${nextCount}.`,
	}
}

function addLog(state: GameState, message: string): GameState {
	return { ...state, log: [message, ...state.log].slice(0, 7) }
}

function freshGame(previous?: GameState, tutorial = false): GameState {
	const fullDeck = shuffle(createDeck())
	let human = fullDeck.slice(0, 8)
	let cpu = fullDeck.slice(8, 16)
	let drawPile = fullDeck.slice(16)
	let starter: Player
	let starterNote: string
	let phase: Phase = 'playing'

	if (tutorial) {
		const deck = createDeck()
		const pick = (id: string) => deck.find((card) => card.id === id)!
		human = ['0-spades-3', '0-hearts-3', '0-spades-4', '0-hearts-4', '0-diamonds-4', '0-spades-7', '0-hearts-J', '0-clubs-2'].map(pick)
		cpu = ['0-clubs-3', '0-spades-5', '0-hearts-5', '0-diamonds-5', '0-hearts-8', '0-clubs-9', '0-diamonds-Q', '0-spades-A'].map(pick)
		const reserved = new Set([...human, ...cpu].map((card) => card.id))
		const rescue = ['0-spades-6', '0-hearts-6', '0-diamonds-6'].map(pick)
		for (const card of rescue) reserved.add(card.id)
		drawPile = [...rescue, ...shuffle(deck.filter((card) => !reserved.has(card.id)))]
		starter = 'human'
		starterNote = 'Training protocol engaged. You control the opening move.'
	} else if (!previous?.winner || !previous.loser) {
		let humanDraw: PlayingCard
		let cpuDraw: PlayingCard
		do {
			const selection = shuffle(createDeck()).slice(0, 2)
			humanDraw = selection[0]!
			cpuDraw = selection[1]!
		} while (humanDraw.rank === cpuDraw.rank)
		starter = rankValue(humanDraw.rank) > rankValue(cpuDraw.rank) ? 'human' : 'cpu'
		starterNote = `High draw: you drew ${humanDraw.rank}; Machine drew ${cpuDraw.rank}. ${playerName(starter)} start${starter === 'human' ? '' : 's'}.`
	} else {
		starter = previous.loser
		const winner = previous.winner
		const loser = previous.loser
		const loserHand = loser === 'human' ? human : cpu
		const best = [...loserHand].sort((a, b) => rankValue(b.rank) - rankValue(a.rank))[0]!

		if (loser === 'human') human = human.filter((card) => card.id !== best.id)
		else cpu = cpu.filter((card) => card.id !== best.id)

		if (winner === 'human') human = [...human, best]
		else cpu = [...cpu, best]

		if (winner === 'human') {
			phase = 'exchange'
			starterNote = `The Machine gives you its best card: ${best.rank}. Choose any card to return.`
		} else {
			const returned = [...cpu].sort((a, b) => rankValue(a.rank) - rankValue(b.rank))[0]!
			cpu = cpu.filter((card) => card.id !== returned.id)
			human = [...human, returned]
			starterNote = `You surrender ${best.rank}. The Machine returns ${returned.rank}. As last game's loser, you start.`
		}
	}

	return {
		human: sortHand(human),
		cpu: sortHand(cpu),
		drawPile,
		recycle: [],
		activeRank: null,
		activeCards: [],
		lastSuccessful: null,
		turn: starter,
		phase,
		humanHasDrawn: false,
		awaitingDecision: false,
		forcedContinuation: false,
		winner: null,
		loser: null,
		gameNumber: previous ? previous.gameNumber + 1 : 1,
		humanWins: previous?.humanWins ?? 0,
		cpuWins: previous?.cpuWins ?? 0,
		starterNote,
		log: [starterNote],
	}
}

function drawCards(state: GameState, player: Player): { state: GameState; drawn: PlayingCard[] } {
	const required = state.activeCards.length
	let available = [...state.drawPile]
	let recycle = [...state.recycle]

	if (available.length < required && recycle.length > 0) {
		available = [...available, ...shuffle(recycle)]
		recycle = []
	}

	const amount = Math.min(required, available.length)
	const drawn = available.slice(0, amount)
	const next = {
		...state,
		drawPile: available.slice(amount),
		recycle,
		[player]: sortHand([...state[player], ...drawn]),
	} as GameState

	return { state: next, drawn }
}

function playCards(state: GameState, player: Player, cards: PlayingCard[]): GameState {
	if (!isLegalPlay(cards, state.activeRank, state.activeCards.length)) return state

	const cardIds = new Set(cards.map((card) => card.id))
	const remaining = state[player].filter((card) => !cardIds.has(card.id))
	const sameRank = state.activeRank === cards[0]!.rank
	const nextActiveCards = sameRank ? [...state.activeCards, ...cards] : cards
	const nextRecycle = state.activeRank && !sameRank
		? [...state.recycle, ...state.activeCards]
		: state.recycle
	const action = sameRank
		? `${playerName(player)} reinforced ${cards[0]!.rank} with ${cards.length}. Count is now ${nextActiveCards.length}.`
		: `${playerName(player)} played ${cards.length} × ${cards[0]!.rank}.`

	let next: GameState = {
		...state,
		[player]: remaining,
		activeRank: cards[0]!.rank,
		activeCards: nextActiveCards,
		recycle: nextRecycle,
		lastSuccessful: player,
		turn: otherPlayer(player),
		humanHasDrawn: false,
		awaitingDecision: false,
		forcedContinuation: false,
	}
	next = addLog(next, action)

	if (remaining.length === 0) {
		const loser = otherPlayer(player)
		next = addLog({
			...next,
			phase: 'game-over',
			winner: player,
			loser,
			humanWins: next.humanWins + (player === 'human' ? 1 : 0),
			cpuWins: next.cpuWins + (player === 'cpu' ? 1 : 0),
		}, `${playerName(player)} emptied the hand. Game over.`)
	}

	return next
}

function declineTurn(state: GameState, player: Player): GameState {
	const nextPlayer = otherPlayer(player)
	return addLog({
		...state,
		turn: nextPlayer,
		humanHasDrawn: false,
		awaitingDecision: nextPlayer === state.lastSuccessful,
		forcedContinuation: false,
	}, `${playerName(player)} will be back.`)
}

function restartSequence(state: GameState, player: Player): GameState {
	return addLog({
		...state,
		recycle: [...state.recycle, ...state.activeCards],
		activeCards: [],
		activeRank: null,
		lastSuccessful: null,
		turn: player,
		awaitingDecision: false,
		humanHasDrawn: false,
		forcedContinuation: false,
	}, `${playerName(player)} cleared the table and controls the restart.`)
}

function planComputerTurn(input: GameState): ComputerTurnStep[] {
	if (input.phase !== 'playing' || input.turn !== 'cpu') return []
	let state = input
	const steps: ComputerTurnStep[] = []

	if (state.awaitingDecision) {
		const continuation = chooseComputerPlay(state.cpu, state.activeRank, state.activeCards.length)
		if (!continuation || Math.random() < 0.34) {
			state = restartSequence(state, 'cpu')
			steps.push({
				wait: 520,
				state,
				cue: {
					side: 'cpu',
					tone: 'move',
					label: 'SEQUENCE RETURNED',
					title: 'TABLE RESET.',
					detail: 'THE MACHINE CLEARS THE CARDS AND OPENS AGAIN.',
				},
			})
		} else {
			state = addLog({ ...state, awaitingDecision: false }, 'The Machine keeps the sequence alive.')
		}
	}

	let play = chooseComputerPlay(state.cpu, state.activeRank, state.activeCards.length)
	const bluffDraw = Boolean(state.activeRank) && (!play || Math.random() < 0.22)

	if (bluffDraw) {
		const result = drawCards(state, 'cpu')
		state = addLog(result.state, `The Machine claims it cannot play and draws ${result.drawn.length}.`)
		steps.push({
			wait: steps.length > 0 ? 900 : 520,
			state,
			drawCount: result.drawn.length,
			cue: {
				side: 'cpu',
				tone: 'warning',
				label: 'THE MACHINE',
				title: 'CAN’T PLAY.',
				detail: `DRAWING ${result.drawn.length}. WATCH THE PILE.`,
			},
		})
		play = chooseComputerPlay(state.cpu, state.activeRank, state.activeCards.length)
		if (!play || Math.random() < 0.18) {
			state = declineTurn(state, 'cpu')
			steps.push({
				wait: 1500,
				state,
				cue: {
					side: 'cpu',
					tone: 'warning',
					label: 'NO RESCUE PLAY',
					title: 'I’LL BE BACK.',
					detail: 'THE MACHINE PASSES. YOUR MOVE.',
				},
			})
			return steps
		}
		state = addLog(state, 'The Machine says: “I’ll be back.”')
	}

	if (!play) {
		state = declineTurn(state, 'cpu')
		steps.push({
			wait: steps.length > 0 ? 1250 : 620,
			state,
			cue: {
				side: 'cpu',
				tone: 'warning',
				label: 'NO LEGAL RESPONSE',
				title: 'CAN’T PLAY.',
				detail: 'THE MACHINE PASSES. YOUR MOVE.',
			},
		})
		return steps
	}

	const rank = play[0]!.rank
	const previousCount = state.activeCards.length
	const reinforcesRank = state.activeRank === rank
	const nextCount = reinforcesRank ? previousCount + play.length : play.length
	state = playCards(state, 'cpu', play)
	steps.push({
		wait: bluffDraw ? 1450 : steps.length > 0 ? 1000 : 680,
		state,
		cue: reinforcesRank
			? levelUpCue('cpu', rank, previousCount, nextCount)
			: {
				side: 'cpu',
				tone: 'move',
				label: bluffDraw ? 'RESCUE PLAY' : 'COUNTERPLAY',
				title: bluffDraw ? 'BACK IN THE FIGHT.' : `${play.length} × ${rank}.`,
				detail: `THE MACHINE PLAYS ${play.length} × ${rank}. ${state.phase === 'game-over' ? 'HAND EMPTY.' : 'YOUR MOVE.'}`,
			},
	})

	return steps
}

const BRIEFING_STEPS = [
	{
		code: 'OBJECTIVE',
		title: 'EMPTY YOUR HAND.',
		body: 'You start with eight cards. Play them all before the Machine. Three is the lowest rank; two is the highest.',
		visual: '8 → 0',
	},
	{
		code: 'LEGAL PLAYS',
		title: 'BEAT IT OR BUILD IT.',
		body: 'A higher rank must use exactly the active number of cards. Adding the same rank increases that number.',
		visual: '3 + 3 → 4 + 4',
	},
	{
		code: 'ZERO TRUST',
		title: 'THE DRAW CAN BE A BLUFF.',
		body: 'You may claim you cannot play even when you can. Draw the active count, then play from your whole hand—or wait.',
		visual: '? + DRAW → RETURN',
	},
	{
		code: 'THE RETURN',
		title: 'CONTROL COMES BACK AROUND.',
		body: 'If everyone declines, the last successful player chooses to continue the sequence or clear the table and restart.',
		visual: 'PLAY → PASS → RETURN',
	},
] as const

function PlayingCardView({
	card,
	selected = false,
	coached = false,
	dimmed = false,
	hidden = false,
	onClick,
	buttonRef,
	tabIndex,
	onFocus,
}: {
	card?: PlayingCard
	selected?: boolean
	coached?: boolean
	dimmed?: boolean
	hidden?: boolean
	onClick?: () => void
	buttonRef?: Ref<HTMLButtonElement>
	tabIndex?: number
	onFocus?: () => void
}) {
	const transitionStyle = card
		? ({ viewTransitionName: `card-${card.id}` } as CSSProperties)
		: undefined

	if (hidden || !card) {
		return <div className="playing-card card-back" style={transitionStyle} aria-hidden="true"><span>IBB</span></div>
	}

	const content = (
		<>
			<span className="card-corner">{card.rank}<small>{SUIT_SYMBOLS[card.suit]}</small></span>
			<span className="card-suit">{SUIT_SYMBOLS[card.suit]}</span>
			<span className="card-corner card-corner-bottom">{card.rank}<small>{SUIT_SYMBOLS[card.suit]}</small></span>
		</>
	)

	return onClick ? (
		<button
			ref={buttonRef}
			type="button"
			className={`playing-card ${selected ? 'is-selected' : ''} ${coached ? 'is-coached' : ''} ${dimmed ? 'is-dimmed' : ''}`}
			style={transitionStyle}
			onClick={onClick}
			onFocus={onFocus}
			tabIndex={tabIndex}
			aria-pressed={selected}
			aria-keyshortcuts="Space"
			aria-label={`${card.rank} of ${card.suit}${selected ? ', selected' : ''}`}
		>
			{content}
		</button>
	) : <div className="playing-card" style={transitionStyle}>{content}</div>
}

export function GameTable() {
	// A stable opening state keeps server and browser markup identical. The real
	// random deal is created after mount while the memory check covers the table.
	const [game, setGame] = useState<GameState>(() => freshGame(undefined, true))
	const [selected, setSelected] = useState<string[]>([])
	const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('checking')
	const [briefingStep, setBriefingStep] = useState(0)
	const [coachStage, setCoachStage] = useState(0)
	const [focusedCardIndex, setFocusedCardIndex] = useState(0)
	const [feedback, setFeedback] = useState<TableFeedback | null>(null)
	const [drawAnimation, setDrawAnimation] = useState<DrawAnimation | null>(null)
	const handCardRefs = useRef<Array<HTMLButtonElement | null>>([])
	const feedbackTimerRef = useRef<number | null>(null)
	const drawTimerRef = useRef<number | null>(null)
	const eventIdRef = useRef(0)
	const cpuSequenceIdRef = useRef(0)
	const cpuTimeoutsRef = useRef<number[]>([])

	const selectedCards = useMemo(
		() => game.human.filter((card) => selected.includes(card.id)),
		[game.human, selected],
	)
	const legalSelection = game.phase === 'exchange'
		? selectedCards.length === 1
		: isLegalPlay(selectedCards, game.activeRank, game.activeCards.length)
	const humanCanContinue = Boolean(chooseComputerPlay(game.human, game.activeRank, game.activeCards.length))
	const coachedCards = useMemo(() => {
		if (onboardingMode !== 'guided') return []
		if (coachStage === 0) return game.human.filter((card) => card.rank === '3')
		if (coachStage === 1 || coachStage === 3) {
			return chooseComputerPlay(game.human, game.activeRank, game.activeCards.length) ?? []
		}
		return []
	}, [coachStage, game.activeCards.length, game.activeRank, game.human, onboardingMode])
	const coachedCardIds = useMemo(() => new Set(coachedCards.map((card) => card.id)), [coachedCards])
	const guidedSelectionValid = onboardingMode !== 'guided' || ![0, 1, 3].includes(coachStage)
		|| (selectedCards.length === coachedCards.length && selectedCards.every((card) => coachedCardIds.has(card.id)))
	const playableSelection = legalSelection && guidedSelectionValid
	const canPlayNow = game.phase === 'playing' && game.turn === 'human' && !game.awaitingDecision && playableSelection
	const canDrawNow = game.phase === 'playing' && game.turn === 'human' && !game.awaitingDecision
		&& !game.forcedContinuation && !game.humanHasDrawn && Boolean(game.activeRank)
	const canPassNow = game.phase === 'playing' && game.turn === 'human' && !game.awaitingDecision
		&& !game.forcedContinuation && (!game.activeRank || game.humanHasDrawn)
	const canContinueNow = game.phase === 'playing' && game.turn === 'human' && game.awaitingDecision && humanCanContinue
	const canRestartNow = game.phase === 'playing' && game.turn === 'human' && game.awaitingDecision
	const canConfirmNow = game.phase === 'exchange' ? legalSelection : canPlayNow

	useEffect(() => {
		setGame(freshGame())
		try {
			setOnboardingMode(window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'complete' ? 'off' : 'prompt')
		} catch {
			setOnboardingMode('prompt')
		}
	}, [])

	useEffect(() => {
		if (game.phase !== 'playing' || game.turn !== 'cpu') return
		if (onboardingMode === 'checking' || onboardingMode === 'prompt' || onboardingMode === 'briefing') return
		if (cpuSequenceIdRef.current !== 0) return

		const steps = planComputerTurn(game)
		if (steps.length === 0) return

		const sequenceId = ++eventIdRef.current
		cpuSequenceIdRef.current = sequenceId
		let elapsed = 0

		steps.forEach((step, index) => {
			elapsed += step.wait
			const timer = window.setTimeout(() => {
				if (cpuSequenceIdRef.current !== sequenceId) return
				const isLastStep = index === steps.length - 1
				if (isLastStep) cpuSequenceIdRef.current = 0

				if (step.drawCount) {
					startDrawAnimation('cpu', step.drawCount)
					announceFeedback(step.cue, 1800)
					const commitTimer = window.setTimeout(() => {
						animateTableUpdate(() => setGame(step.state))
					}, 320)
					cpuTimeoutsRef.current.push(commitTimer)
				} else {
					animateTableUpdate(() => setGame(step.state))
					announceFeedback(step.cue, step.cue.tone === 'impact' ? 2100 : 1650)
				}
			}, elapsed)
			cpuTimeoutsRef.current.push(timer)
		})
	}, [game.phase, game.turn, game.awaitingDecision, game.activeCards.length, game.cpu.length, onboardingMode])

	useEffect(() => () => {
		cpuTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer))
		if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
		if (drawTimerRef.current) window.clearTimeout(drawTimerRef.current)
		cpuSequenceIdRef.current = 0
	}, [])

	useEffect(() => {
		if (game.turn !== 'human') setSelected([])
	}, [game.turn])

	useEffect(() => {
		setFocusedCardIndex((current) => Math.min(current, Math.max(0, game.human.length - 1)))
		handCardRefs.current = handCardRefs.current.slice(0, game.human.length)
	}, [game.human.length])

	function toggleCard(card: PlayingCard) {
		if (game.phase === 'playing' && (game.turn !== 'human' || game.awaitingDecision)) return
		if (onboardingMode === 'guided' && coachStage === 2) return
		if (onboardingMode === 'guided' && [0, 1, 3].includes(coachStage) && !coachedCardIds.has(card.id)) return
		setSelected((current) => current.includes(card.id)
			? current.filter((id) => id !== card.id)
			: [...current, card.id])
	}

	function announceFeedback(cue: FeedbackCue, duration = 1700) {
		if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
		const id = ++eventIdRef.current
		setFeedback({ ...cue, id })
		feedbackTimerRef.current = window.setTimeout(() => {
			setFeedback((current) => current?.id === id ? null : current)
		}, duration)
	}

	function startDrawAnimation(player: Player, count: number) {
		if (count < 1) return
		if (drawTimerRef.current) window.clearTimeout(drawTimerRef.current)
		const id = ++eventIdRef.current
		setDrawAnimation({ id, player, count })
		drawTimerRef.current = window.setTimeout(() => {
			setDrawAnimation((current) => current?.id === id ? null : current)
		}, 1250)
	}

	function cancelComputerSequence() {
		cpuTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer))
		cpuTimeoutsRef.current = []
		cpuSequenceIdRef.current = 0
	}

	function rememberOnboarding() {
		try {
			window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'complete')
		} catch {
			// The game remains playable when private browsing or browser policy blocks storage.
		}
	}

	function dismissOnboarding() {
		rememberOnboarding()
		setOnboardingMode('off')
	}

	function finishOnboarding() {
		rememberOnboarding()
		setOnboardingMode('complete')
	}

	function replayTraining() {
		cancelComputerSequence()
		setBriefingStep(0)
		setOnboardingMode('briefing')
	}

	function humanPlay() {
		if (!canPlayNow) return
		const rank = selectedCards[0]?.rank
		const previousCount = game.activeCards.length
		const reinforcesRank = Boolean(rank && game.activeRank === rank)
		const nextCount = previousCount + selectedCards.length
		animateTableUpdate(() => {
			setGame((current) => playCards(current, 'human', selectedCards))
			if (onboardingMode === 'guided') {
				if (coachStage === 0) setCoachStage(1)
				else if (coachStage === 1) setCoachStage(2)
				else if (coachStage === 3) finishOnboarding()
			}
			setSelected([])
		})
		if (rank && reinforcesRank) announceFeedback(levelUpCue('human', rank, previousCount, nextCount), 2200)
	}

	function humanDraw() {
		if (!canDrawNow) return
		startDrawAnimation('human', Math.min(game.activeCards.length, game.drawPile.length + game.recycle.length))
		announceFeedback({
			side: 'human',
			tone: 'warning',
			label: 'ZERO-TRUST DRAW',
			title: `DRAWING ${game.activeCards.length}.`,
			detail: 'NOW PLAY A RESCUE SET—or PASS.',
		}, 1650)
		animateTableUpdate(() => {
			setGame((current) => {
				const result = drawCards(current, 'human')
				return addLog(
					{ ...result.state, humanHasDrawn: true },
					`You claim you cannot play and draw ${result.drawn.length}.`,
				)
			})
			if (onboardingMode === 'guided' && coachStage === 2) setCoachStage(3)
		})
	}

	function humanDecline() {
		if (!canPassNow) return
		animateTableUpdate(() => {
			setGame((current) => declineTurn(current, 'human'))
			setSelected([])
			if (onboardingMode === 'guided' && coachStage === 3) finishOnboarding()
		})
	}

	function humanPass() {
		if (!canPassNow) return
		if (onboardingMode === 'guided') {
			if (coachStage === 3) humanDecline()
			return
		}
		animateTableUpdate(() => {
			setGame((current) => declineTurn(current, 'human'))
			setSelected([])
		})
		announceFeedback({
			side: 'human',
			tone: 'warning',
			label: 'TURN PASSED',
			title: 'I’LL BE BACK.',
			detail: 'THE MACHINE HAS THE NEXT MOVE.',
		}, 1500)
	}

	function beginGuidedGame() {
		cancelComputerSequence()
		animateTableUpdate(() => {
			setSelected([])
			setCoachStage(0)
			setGame(freshGame(undefined, true))
			setOnboardingMode('guided')
		})
	}

	function returnExchangeCard() {
		if (game.phase !== 'exchange' || selectedCards.length !== 1) return
		const returned = selectedCards[0]!
		animateTableUpdate(() => {
			setGame((current) => addLog({
				...current,
				human: sortHand(current.human.filter((card) => card.id !== returned.id)),
				cpu: sortHand([...current.cpu, returned]),
				phase: 'playing',
			}, `You return ${returned.rank}. The Machine, last game's loser, starts.`))
			setSelected([])
		})
	}

	function startNextGame() {
		if (game.phase !== 'game-over') return
		animateTableUpdate(() => {
			setGame((current) => freshGame(current))
			setSelected([])
		})
	}

	function continueForHuman() {
		if (!canContinueNow) return
		animateTableUpdate(() => {
			setGame((current) => addLog(
				{ ...current, awaitingDecision: false, forcedContinuation: true },
				'You keep the sequence alive.',
			))
		})
		announceFeedback({
			side: 'human',
			tone: 'move',
			label: 'TABLE CONTROL',
			title: 'SEQUENCE CONTINUES.',
			detail: 'PLAY A LEGAL RESPONSE TO KEEP THE PRESSURE ON.',
		}, 1500)
	}

	function restartForHuman() {
		if (!canRestartNow) return
		animateTableUpdate(() => {
			setGame((current) => restartSequence(current, 'human'))
			setSelected([])
		})
		announceFeedback({
			side: 'human',
			tone: 'move',
			label: 'TABLE CONTROL',
			title: 'TABLE CLEARED.',
			detail: 'OPEN THE NEW SEQUENCE WITH ANY MATCHING SET.',
		}, 1500)
	}

	function moveHandFocus(nextIndex: number) {
		if (game.human.length === 0) return
		const normalizedIndex = (nextIndex + game.human.length) % game.human.length
		setFocusedCardIndex(normalizedIndex)
		window.requestAnimationFrame(() => handCardRefs.current[normalizedIndex]?.focus())
	}

	useEffect(() => {
		function handleTableKeyDown(event: KeyboardEvent) {
			if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
			if (onboardingMode === 'checking' || onboardingMode === 'prompt' || onboardingMode === 'briefing') return

			const target = event.target as HTMLElement | null
			const focusedCard = target?.closest('.human-hand .playing-card')
			if (target?.closest('input, textarea, select')) return

			const key = event.key.toLowerCase()
			if (event.key === 'Escape' && canPassNow) {
				event.preventDefault()
				humanPass()
				return
			}
			if (key === 'd' && canDrawNow) {
				event.preventDefault()
				humanDraw()
				return
			}
			if (key === 'c' && canContinueNow) {
				event.preventDefault()
				continueForHuman()
				return
			}
			if (key === 'r' && canRestartNow) {
				event.preventDefault()
				restartForHuman()
				return
			}
			if (key === 'n' && game.phase === 'game-over') {
				event.preventDefault()
				startNextGame()
				return
			}
			if (target?.closest('input, textarea, select, a, button') && !focusedCard) return

			if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
				event.preventDefault()
				const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1
				moveHandFocus(focusedCard ? focusedCardIndex + direction : focusedCardIndex)
				return
			}
			if (event.key === 'Home' || event.key === 'End') {
				event.preventDefault()
				moveHandFocus(event.key === 'Home' ? 0 : game.human.length - 1)
				return
			}
			if (event.key === ' ') {
				event.preventDefault()
				const card = game.human[focusedCardIndex]
				if (card) toggleCard(card)
				return
			}
			if (event.key === 'Enter') {
				event.preventDefault()
				if (game.phase === 'exchange') returnExchangeCard()
				else humanPlay()
				return
			}
		}

		document.addEventListener('keydown', handleTableKeyDown)
		return () => document.removeEventListener('keydown', handleTableKeyDown)
	})

	const status = game.phase === 'game-over'
		? game.winner === 'human' ? 'MISSION COMPLETE' : 'THE MACHINE WON'
		: game.phase === 'exchange'
			? 'CHOOSE A CARD TO RETURN'
			: game.awaitingDecision && game.turn === 'human'
				? 'THE SEQUENCE CAME BACK TO YOU'
				: game.turn === 'human' ? 'YOUR MOVE' : 'MACHINE THINKING'
	const coachCopy = coachStage === 0
		? { label: 'GUIDED MOVE 1 / 4', title: 'OPEN WITH THE PAIR OF 3s.', body: 'The glowing cards are your training move. Select both 3s, then play them to establish a pair.' }
		: coachStage === 1
			? game.turn === 'cpu'
				? { label: 'GUIDED MOVE 2 / 4', title: 'WATCH THE COUNT.', body: 'The Machine is answering your pair. Notice what happens when it adds the same active rank.' }
				: { label: 'GUIDED MOVE 2 / 4', title: `ANSWER ${game.activeCards.length} × ${game.activeRank}.`, body: 'A higher rank needs exactly the current count. The glowing cards form your legal response.' }
				: coachStage === 2
					? game.turn === 'cpu'
						? { label: 'GUIDED MOVE 3 / 4', title: 'EXPECT A COUNTERPLAY.', body: 'The Machine is raising the rank. Your next lesson is the move that gives the game its name.' }
						: { label: 'GUIDED MOVE 3 / 4', title: 'BLUFF THE DRAW.', body: `Press D or “DRAW ${game.activeCards.length}.” Once the cards arrive, choose whether to play or pass.` }
					: { label: 'GUIDED MOVE 4 / 4', title: 'COME BACK NOW—or LATER.', body: 'The draw completed a legal response. Play the glowing set immediately, or decline and wait for the sequence to return.' }
	const briefing = BRIEFING_STEPS[briefingStep]!
	const selectionMessage = selectedCards.length === 0
		? game.activeRank
			? game.humanHasDrawn
				? `Play a legal response, or pass now that the draw is complete.`
				: `Beat ${game.activeRank}, add more ${game.activeRank}s, or draw before passing.`
			: 'Open with any same-rank set.'
		: legalSelection ? 'VALID PLAY' : 'INVALID: MATCH THE RANK OR THE COUNT'
	const turnControl = game.phase === 'game-over' ? (
		<div className="hand-command-bar game-result" aria-label="Game result">
			<div className="hand-command-copy"><small>FINAL STATUS</small><strong>{game.winner === 'human' ? 'YOU GOT OUT.' : 'YOU WERE LEFT BEHIND.'}</strong><p>{game.winner === 'human' ? 'The Machine surrenders its best card next game.' : 'Your best card belongs to the Machine next game.'}</p></div>
			<div className="hand-command-actions"><button className="machine-button primary" onClick={startNextGame} aria-keyshortcuts="N">PLAY NEXT GAME <kbd>N</kbd></button></div>
		</div>
	) : game.phase === 'exchange' ? (
		<div className="hand-command-bar" aria-label="Card exchange controls">
			<div className="hand-command-copy"><small>WINNER&apos;S PRIVILEGE</small><strong>RETURN ANY CARD</strong><p>You may return the exact card you received.</p></div>
			<div className="hand-command-actions"><button className="machine-button primary" disabled={!legalSelection} onClick={returnExchangeCard} aria-keyshortcuts="Enter">CONFIRM RETURN <kbd>ENTER</kbd></button></div>
		</div>
	) : game.awaitingDecision && game.turn === 'human' ? (
		<div className="hand-command-bar" aria-label="Sequence controls">
			<div className="hand-command-copy"><small>YOU CONTROL THE TABLE</small><strong>CONTINUE OR RESTART?</strong><p>{humanCanContinue ? 'The sequence came back to you.' : 'No legal continuation remains.'}</p></div>
			<div className="hand-command-actions"><button className="machine-button primary" disabled={!canContinueNow} onClick={continueForHuman} aria-keyshortcuts="C">CONTINUE <kbd>C</kbd></button><button className="machine-button" onClick={restartForHuman} aria-keyshortcuts="R">CLEAR + RESTART <kbd>R</kbd></button></div>
		</div>
	) : (
		<div className="hand-command-bar" aria-label="Turn controls">
			<div className="hand-command-copy" aria-live="polite"><small>{game.turn === 'human' ? 'YOUR COMMAND' : 'OPPONENT ACTIVE'}</small><strong>{selectedCards.length > 0 ? `${selectedCards.length} × ${selectedCards[0]?.rank ?? ''}` : game.turn === 'human' ? 'MAKE YOUR MOVE' : 'STAND BY'}</strong><p>{selectionMessage}</p></div>
			<div className="hand-command-actions">
					<button className={`machine-button primary ${onboardingMode === 'guided' && [0, 1, 3].includes(coachStage) ? 'coach-target' : ''}`} disabled={!canPlayNow} onClick={humanPlay} aria-keyshortcuts="Enter">PLAY SELECTED <kbd>ENTER</kbd></button>
					{canDrawNow && (
						<button className={`machine-button warning ${onboardingMode === 'guided' && coachStage === 2 ? 'coach-target' : ''}`} onClick={humanDraw} aria-keyshortcuts="D">DRAW {game.activeCards.length} <kbd>D</kbd></button>
					)}
				{canPassNow && onboardingMode !== 'guided' && <button className="machine-button" onClick={humanPass} aria-keyshortcuts="Escape">PASS TURN <kbd>ESC</kbd></button>}
				{game.activeRank && game.turn === 'human' && game.humanHasDrawn && onboardingMode === 'guided' && !game.forcedContinuation && (
					<button className={coachStage === 3 ? 'machine-button coach-target-secondary' : 'machine-button'} onClick={humanDecline} aria-keyshortcuts="Escape">I&apos;LL BE BACK LATER <kbd>ESC</kbd></button>
				)}
			</div>
		</div>
	)

	return (
		<div className="game-console">
			{onboardingMode === 'checking' && (
				<div className="onboarding-shade onboarding-loading" aria-live="polite" aria-busy="true">
					<span>RESTORING PLAYER MEMORY…</span>
				</div>
			)}
			{(onboardingMode === 'prompt' || onboardingMode === 'briefing') && (
				<div className="onboarding-shade" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
					<div className="onboarding-card">
						<div className="onboarding-top"><span>FIRST-CONTACT PROTOCOL</span><b>{onboardingMode === 'prompt' ? '00 / 04' : `${String(briefingStep + 1).padStart(2, '0')} / 04`}</b></div>
						{onboardingMode === 'prompt' ? (
							<>
								<small>NEW PLAYER DETECTED</small>
								<h2 id="onboarding-title">WANT A GUIDED<br />FIRST GAME?</h2>
								<p>We&apos;ll explain the rules, then map out your first four moves at the table. You&apos;ll learn by beating—and bluffing—the Machine.</p>
								<div className="onboarding-actions"><button className="machine-button primary" onClick={() => setOnboardingMode('briefing')}>TEACH ME THE GAME</button><button className="machine-button" onClick={dismissOnboarding}>I KNOW THE RULES</button></div>
							</>
						) : (
							<>
								<small>{briefing.code}</small>
								<h2 id="onboarding-title">{briefing.title}</h2>
								<div className="onboarding-visual">{briefing.visual}</div>
								<p>{briefing.body}</p>
								<div className="onboarding-dots">{BRIEFING_STEPS.map((step, index) => <i key={step.code} className={index <= briefingStep ? 'active' : ''} />)}</div>
								<div className="onboarding-actions"><button className="machine-button primary" onClick={() => briefingStep === BRIEFING_STEPS.length - 1 ? beginGuidedGame() : setBriefingStep((step) => step + 1)}>{briefingStep === BRIEFING_STEPS.length - 1 ? 'BEGIN GUIDED GAME' : 'NEXT PROTOCOL'}</button><button className="machine-button" onClick={dismissOnboarding}>SKIP TRAINING</button></div>
							</>
						)}
					</div>
				</div>
			)}
			{(onboardingMode === 'guided' || onboardingMode === 'complete') && (
				<div className={`coach-strip ${onboardingMode === 'complete' ? 'complete' : ''}`} role="status">
					<div className="coach-index">{onboardingMode === 'complete' ? '✓' : `0${coachStage + 1}`}</div>
					<div><small>{onboardingMode === 'complete' ? 'TRAINING COMPLETE' : coachCopy.label}</small><strong>{onboardingMode === 'complete' ? 'YOU ARE OPERATIONAL.' : coachCopy.title}</strong><p>{onboardingMode === 'complete' ? 'The guardrails are off. Read the count, question every draw, and empty your hand.' : coachCopy.body}</p></div>
					<button onClick={dismissOnboarding}>{onboardingMode === 'complete' ? 'ENTER FREE PLAY' : 'EXIT TRAINING'}</button>
				</div>
			)}
			<div className="game-statusbar">
				<div><span>GAME</span><strong>{String(game.gameNumber).padStart(2, '0')}</strong></div>
				<div><span>YOU</span><strong>{game.humanWins}</strong></div>
				<div className="game-status-main"><i />{status}</div>
				<div><span>MACHINE</span><strong>{game.cpuWins}</strong></div>
				<div><span>DRAW</span><strong>{game.drawPile.length}</strong></div>
			</div>

			<div className="game-grid">
				<div className="game-board">
					<div className="game-event-layer" aria-live="assertive" aria-atomic="true">
						{feedback && (
							<div key={feedback.id} className={`table-feedback side-${feedback.side} tone-${feedback.tone}`} role="status">
								<small>{feedback.label}</small>
								<strong>{feedback.title}</strong>
								<span>{feedback.detail}</span>
							</div>
						)}
					</div>
					{drawAnimation && (
						<div key={drawAnimation.id} className={`draw-flight to-${drawAnimation.player}`} aria-hidden="true">
							{Array.from({ length: Math.min(drawAnimation.count, 4) }, (_, index) => (
								<div
									key={index}
									className="draw-flight-card"
									style={{
										'--flight-delay': `${index * 85}ms`,
										'--flight-offset': `${index * 12}px`,
										'--flight-rotation': `${-8 + index * 4}deg`,
										'--human-flight-rotation': `${-6 + index * 3}deg`,
									} as CSSProperties}
								><span>IBB</span></div>
							))}
							<b>{drawAnimation.count} CARD{drawAnimation.count === 1 ? '' : 'S'}</b>
						</div>
					)}
					<div className="opponent-zone">
						<div className="zone-label"><span>THE MACHINE</span><b>{game.cpu.length} cards</b></div>
						<div className="opponent-hand" aria-label={`The Machine has ${game.cpu.length} cards`}>
							{game.cpu.map((card, index) => <PlayingCardView key={card.id} card={card} hidden />)}
						</div>
					</div>

					<div className="table-center">
						<div className={`draw-stack ${drawAnimation ? 'is-drawing' : ''}`}>
							<PlayingCardView hidden />
							<span>{game.drawPile.length} DRAW</span>
						</div>
						<div className={`active-play ${feedback?.tone === 'impact' ? 'is-impacting' : ''}`}>
							<div className="challenge-label">
								<span>ACTIVE CHALLENGE</span>
								<strong>{game.activeRank ? `${game.activeCards.length} × ${game.activeRank}` : 'OPEN TABLE'}</strong>
							</div>
							<div className="active-cards">
								{game.activeCards.length > 0
									? game.activeCards.map((card) => <PlayingCardView key={card.id} card={card} />)
									: <div className="open-table">PLAY ANY MATCHING SET</div>}
							</div>
						</div>
					</div>

					<div className="human-zone">
						<div className="zone-label"><span>YOUR HAND</span><b>{game.human.length} cards</b></div>
						{turnControl}
						<div className="human-hand">
							{game.human.map((card, index) => (
								<PlayingCardView
									key={card.id}
									card={card}
									buttonRef={(element) => { handCardRefs.current[index] = element }}
									tabIndex={index === focusedCardIndex ? 0 : -1}
									onFocus={() => setFocusedCardIndex(index)}
									selected={selected.includes(card.id)}
									coached={onboardingMode === 'guided' && coachedCardIds.has(card.id) && game.turn === 'human'}
									dimmed={onboardingMode === 'guided' && game.turn === 'human' && !coachedCardIds.has(card.id)}
									onClick={() => toggleCard(card)}
								/>
							))}
						</div>
					</div>
				</div>

				<aside className="control-panel">
					<div className="control-head">
						<span>TURN CONTROL</span>
						<div className="control-tools"><button type="button" onClick={replayTraining}>REPLAY TRAINING</button><i className={game.turn === 'human' ? 'online' : ''} /></div>
					</div>
					<div className="keyboard-panel" aria-label="Keyboard shortcuts">
						<small>KEYBOARD / CURRENT ACTIONS</small>
						<div><kbd>←</kbd><kbd>↑</kbd><kbd>→</kbd><kbd>↓</kbd><span>MOVE</span></div>
						<div><kbd>SPACE</kbd><span>SELECT</span></div>
						<div className={canConfirmNow ? '' : 'is-unavailable'}><kbd>ENTER</kbd><span>{game.phase === 'exchange' ? 'RETURN' : 'PLAY'}</span></div>
						<div className={canDrawNow ? '' : 'is-unavailable'}><kbd>D</kbd><span>DRAW</span></div>
						<div className={canPassNow ? '' : 'is-unavailable'}><kbd>ESC</kbd><span>PASS</span></div>
						{canRestartNow && <div><kbd>R</kbd><span>CLEAR</span></div>}
						{game.awaitingDecision && game.turn === 'human' && <div className={canContinueNow ? '' : 'is-unavailable'}><kbd>C</kbd><span>CONTINUE</span></div>}
						{game.phase === 'game-over' && <div><kbd>N</kbd><span>NEXT GAME</span></div>}
					</div>

					<div className="intel-panel">
						<div className="control-head"><span>ACTION LOG</span></div>
						<ol>{game.log.map((entry, index) => <li key={`${entry}-${index}`} className={index === 0 ? 'latest' : ''}>{entry}</li>)}</ol>
					</div>
				</aside>
			</div>

			<div className="rank-ticker">
				<span>LOW</span>{RANKS.map((rank) => <b key={rank}>{rank}</b>)}<span>HIGH</span>
			</div>
		</div>
	)
}
