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

function freshGame(previous?: GameState): GameState {
	const fullDeck = shuffle(createDeck())
	let human = fullDeck.slice(0, 8)
	let cpu = fullDeck.slice(8, 16)
	const drawPile = fullDeck.slice(16)
	let starter: Player
	let starterNote: string
	let phase: Phase = 'playing'

	if (!previous?.winner || !previous.loser) {
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

function PlayingCardView({
	card,
	selected = false,
	hidden = false,
	onClick,
}: {
	card?: PlayingCard
	selected?: boolean
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
			className={`playing-card ${selected ? 'is-selected' : ''}`}
			onClick={onClick}
			aria-pressed={selected}
			aria-label={`${card.rank} of ${card.suit}${selected ? ', selected' : ''}`}
		>
			{content}
		</button>
	) : <div className="playing-card">{content}</div>
}

export function GameTable() {
	const [game, setGame] = useState<GameState>(() => freshGame())
	const [selected, setSelected] = useState<string[]>([])

	const selectedCards = useMemo(
		() => game.human.filter((card) => selected.includes(card.id)),
		[game.human, selected],
	)
	const legalSelection = game.phase === 'exchange'
		? selectedCards.length === 1
		: isLegalPlay(selectedCards, game.activeRank, game.activeCards.length)
	const humanCanContinue = Boolean(chooseComputerPlay(game.human, game.activeRank, game.activeCards.length))

	useEffect(() => {
		if (game.phase !== 'playing' || game.turn !== 'cpu') return
		const timer = window.setTimeout(() => setGame((current) => runComputerTurn(current)), 720)
		return () => window.clearTimeout(timer)
	}, [game.phase, game.turn, game.awaitingDecision, game.activeCards.length, game.cpu.length])

	useEffect(() => {
		if (game.turn !== 'human') setSelected([])
	}, [game.turn])

	function toggleCard(card: PlayingCard) {
		if (game.phase === 'playing' && (game.turn !== 'human' || game.awaitingDecision)) return
		setSelected((current) => current.includes(card.id)
			? current.filter((id) => id !== card.id)
			: [...current, card.id])
	}

	function humanPlay() {
		if (!legalSelection || game.phase !== 'playing') return
		setGame((current) => playCards(current, 'human', selectedCards))
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

	return (
		<div className="game-console">
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
									onClick={() => toggleCard(card)}
								/>
							))}
						</div>
					</div>
				</div>

				<aside className="control-panel">
					<div className="control-head">
						<span>TURN CONTROL</span>
						<i className={game.turn === 'human' ? 'online' : ''} />
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
							<button className="machine-button primary" disabled={game.turn !== 'human' || !legalSelection} onClick={humanPlay}>PLAY SELECTED</button>
							{game.activeRank && game.turn === 'human' && !game.humanHasDrawn && !game.forcedContinuation && (
								<button className="machine-button warning" onClick={humanDraw}>I CAN'T PLAY — DRAW {game.activeCards.length}</button>
							)}
							{game.activeRank && game.turn === 'human' && game.humanHasDrawn && !game.forcedContinuation && (
								<button className="machine-button" onClick={() => setGame((current) => declineTurn(current, 'human'))}>I'LL BE BACK LATER</button>
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
