'use client'

import { useEffect, useMemo, useState } from 'react'
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

const ONBOARDING_STORAGE_KEY = 'ill-be-back:onboarding:v1'

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

const otherPlayer = (player: Player): Player => player === 'human' ? 'cpu' : 'human'
const playerName = (player: Player): string => player === 'human' ? 'You' : 'The Machine'

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

function runComputerTurn(input: GameState): GameState {
	if (input.phase !== 'playing' || input.turn !== 'cpu') return input
	let state = input

	if (state.awaitingDecision) {
		const continuation = chooseComputerPlay(state.cpu, state.activeRank, state.activeCards.length)
		if (!continuation || Math.random() < 0.34) {
			state = restartSequence(state, 'cpu')
		} else {
			state = addLog({ ...state, awaitingDecision: false }, 'The Machine keeps the sequence alive.')
		}
	}

	let play = chooseComputerPlay(state.cpu, state.activeRank, state.activeCards.length)
	const bluffDraw = Boolean(state.activeRank) && (!play || Math.random() < 0.22)

	if (bluffDraw) {
		const result = drawCards(state, 'cpu')
		state = addLog(result.state, `The Machine claims it cannot play and draws ${result.drawn.length}.`)
		play = chooseComputerPlay(state.cpu, state.activeRank, state.activeCards.length)
		if (!play || Math.random() < 0.18) return declineTurn(state, 'cpu')
		state = addLog(state, 'The Machine says: “I’ll be back.”')
	}

	return play ? playCards(state, 'cpu', play) : declineTurn(state, 'cpu')
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
}: {
	card?: PlayingCard
	selected?: boolean
	coached?: boolean
	dimmed?: boolean
	hidden?: boolean
	onClick?: () => void
}) {
	if (hidden || !card) {
		return <div className="playing-card card-back" aria-hidden="true"><span>IBB</span></div>
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
			type="button"
			className={`playing-card ${selected ? 'is-selected' : ''} ${coached ? 'is-coached' : ''} ${dimmed ? 'is-dimmed' : ''}`}
			onClick={onClick}
			aria-pressed={selected}
			aria-label={`${card.rank} of ${card.suit}${selected ? ', selected' : ''}`}
		>
			{content}
		</button>
	) : <div className="playing-card">{content}</div>
}

export function GameTable() {
	// A stable opening state keeps server and browser markup identical. The real
	// random deal is created after mount while the memory check covers the table.
	const [game, setGame] = useState<GameState>(() => freshGame(undefined, true))
	const [selected, setSelected] = useState<string[]>([])
	const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('checking')
	const [briefingStep, setBriefingStep] = useState(0)
	const [coachStage, setCoachStage] = useState(0)

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
		const timer = window.setTimeout(() => setGame((current) => runComputerTurn(current)), 720)
		return () => window.clearTimeout(timer)
	}, [game.phase, game.turn, game.awaitingDecision, game.activeCards.length, game.cpu.length, onboardingMode])

	useEffect(() => {
		if (game.turn !== 'human') setSelected([])
	}, [game.turn])

	function toggleCard(card: PlayingCard) {
		if (game.phase === 'playing' && (game.turn !== 'human' || game.awaitingDecision)) return
		if (onboardingMode === 'guided' && coachStage === 2) return
		if (onboardingMode === 'guided' && [0, 1, 3].includes(coachStage) && !coachedCardIds.has(card.id)) return
		setSelected((current) => current.includes(card.id)
			? current.filter((id) => id !== card.id)
			: [...current, card.id])
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
		setBriefingStep(0)
		setOnboardingMode('briefing')
	}

	function humanPlay() {
		if (!playableSelection || game.phase !== 'playing') return
		setGame((current) => playCards(current, 'human', selectedCards))
		if (onboardingMode === 'guided') {
			if (coachStage === 0) setCoachStage(1)
			else if (coachStage === 1) setCoachStage(2)
			else if (coachStage === 3) finishOnboarding()
		}
		setSelected([])
	}

	function humanDraw() {
		if (game.turn !== 'human' || game.humanHasDrawn || !game.activeRank) return
		setGame((current) => {
			const result = drawCards(current, 'human')
			return addLog(
				{ ...result.state, humanHasDrawn: true },
				`You claim you cannot play and draw ${result.drawn.length}.`,
			)
		})
		if (onboardingMode === 'guided' && coachStage === 2) setCoachStage(3)
	}

	function humanDecline() {
		setGame((current) => declineTurn(current, 'human'))
		if (onboardingMode === 'guided' && coachStage === 3) finishOnboarding()
	}

	function beginGuidedGame() {
		setSelected([])
		setCoachStage(0)
		setGame(freshGame(undefined, true))
		setOnboardingMode('guided')
	}

	function returnExchangeCard() {
		if (game.phase !== 'exchange' || selectedCards.length !== 1) return
		const returned = selectedCards[0]!
		setGame((current) => addLog({
			...current,
			human: sortHand(current.human.filter((card) => card.id !== returned.id)),
			cpu: sortHand([...current.cpu, returned]),
			phase: 'playing',
		}, `You return ${returned.rank}. The Machine, last game's loser, starts.`))
		setSelected([])
	}

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
					: { label: 'GUIDED MOVE 3 / 4', title: 'BLUFF THE DRAW.', body: `Press “I CAN'T PLAY — DRAW ${game.activeCards.length}.” You are allowed to do this even if a legal play is already in your hand.` }
				: { label: 'GUIDED MOVE 4 / 4', title: 'COME BACK NOW—or LATER.', body: 'The draw completed a legal response. Play the glowing set immediately, or decline and wait for the sequence to return.' }
	const briefing = BRIEFING_STEPS[briefingStep]!

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
					<div className="opponent-zone">
						<div className="zone-label"><span>THE MACHINE</span><b>{game.cpu.length} cards</b></div>
						<div className="opponent-hand" aria-label={`The Machine has ${game.cpu.length} cards`}>
							{game.cpu.map((card, index) => <PlayingCardView key={card.id} card={card} hidden />)}
						</div>
					</div>

					<div className="table-center">
						<div className="draw-stack">
							<PlayingCardView hidden />
							<span>{game.drawPile.length} DRAW</span>
						</div>
						<div className="active-play">
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
						<div className="human-hand">
							{game.human.map((card) => (
								<PlayingCardView
									key={card.id}
									card={card}
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

					{game.phase === 'game-over' ? (
						<div className="decision-card game-result">
							<small>FINAL STATUS</small>
							<h2>{game.winner === 'human' ? 'YOU GOT OUT.' : 'YOU WERE LEFT BEHIND.'}</h2>
							<p>{game.winner === 'human' ? 'The Machine must surrender its best card next game.' : 'Your best card belongs to the Machine next game.'}</p>
							<button className="machine-button primary" onClick={() => setGame((current) => freshGame(current))}>PLAY NEXT GAME</button>
						</div>
					) : game.phase === 'exchange' ? (
						<div className="decision-card">
							<small>WINNER'S PRIVILEGE</small>
							<h2>RETURN ANY CARD</h2>
							<p>You may even return the exact card you just received.</p>
							<button className="machine-button primary" disabled={!legalSelection} onClick={returnExchangeCard}>CONFIRM RETURN</button>
						</div>
					) : game.awaitingDecision && game.turn === 'human' ? (
						<div className="decision-card">
							<small>YOU CONTROL THE TABLE</small>
							<h2>CONTINUE OR RESTART?</h2>
							<button className="machine-button primary" disabled={!humanCanContinue} onClick={() => setGame((current) => addLog({ ...current, awaitingDecision: false, forcedContinuation: true }, 'You keep the sequence alive.'))}>CONTINUE</button>
							<button className="machine-button" onClick={() => setGame((current) => restartSequence(current, 'human'))}>CLEAR + RESTART</button>
							{!humanCanContinue && <p>You have no legal continuation. Clear the table to restart.</p>}
						</div>
					) : (
						<div className="decision-card">
							<small>{game.turn === 'human' ? 'SELECT MATCHING CARDS' : 'OPPONENT ACTIVE'}</small>
							<h2>{selectedCards.length > 0 ? `${selectedCards.length} × ${selectedCards[0]?.rank ?? ''}` : 'MAKE YOUR MOVE'}</h2>
							<button className={`machine-button primary ${onboardingMode === 'guided' && [0, 1, 3].includes(coachStage) ? 'coach-target' : ''}`} disabled={game.turn !== 'human' || !playableSelection} onClick={humanPlay}>PLAY SELECTED</button>
							{game.activeRank && game.turn === 'human' && !game.humanHasDrawn && !game.forcedContinuation && (
								<button className={`machine-button warning ${onboardingMode === 'guided' && coachStage === 2 ? 'coach-target' : ''}`} onClick={humanDraw}>I CAN'T PLAY — DRAW {game.activeCards.length}</button>
							)}
							{game.activeRank && game.turn === 'human' && game.humanHasDrawn && !game.forcedContinuation && (
								<button className={onboardingMode === 'guided' && coachStage === 3 ? 'machine-button coach-target-secondary' : 'machine-button'} onClick={humanDecline}>I'LL BE BACK LATER</button>
							)}
							<p className="legality-note">{selectedCards.length === 0
								? game.activeRank ? `Beat ${game.activeRank} with exactly ${game.activeCards.length}, or add more ${game.activeRank}s.` : 'Open with any same-rank set.'
								: legalSelection ? 'VALID PLAY' : 'INVALID: MATCH THE RANK OR THE COUNT'}</p>
						</div>
					)}

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
