export const RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'] as const

export type Rank = (typeof RANKS)[number]
export type Suit = 'clubs' | 'diamonds' | 'hearts' | 'spades'

export interface PlayingCard {
	id: string
	rank: Rank
	suit: Suit
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
	clubs: '♣',
	diamonds: '♦',
	hearts: '♥',
	spades: '♠',
}

export function rankValue(rank: Rank): number {
	return RANKS.indexOf(rank)
}

export function shuffle<T>(items: T[]): T[] {
	const shuffled = [...items]
	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1))
		;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!]
	}
	return shuffled
}

export function createDeck(deckCount = 1): PlayingCard[] {
	const suits: Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']
	return Array.from({ length: deckCount }, (_, deckIndex) =>
		suits.flatMap((suit) =>
			RANKS.map((rank) => ({
				id: `${deckIndex}-${suit}-${rank}`,
				rank,
				suit,
			})),
		),
	).flat()
}

export function isSameRank(cards: PlayingCard[]): boolean {
	return cards.length > 0 && cards.every((card) => card.rank === cards[0]?.rank)
}

export function isLegalPlay(
	cards: PlayingCard[],
	activeRank: Rank | null,
	activeCount: number,
): boolean {
	if (!isSameRank(cards)) return false
	if (!activeRank) return true

	const playedRank = cards[0]!.rank
	if (playedRank === activeRank) return true

	return rankValue(playedRank) > rankValue(activeRank) && cards.length === activeCount
}

export function sortHand(cards: PlayingCard[]): PlayingCard[] {
	return [...cards].sort((a, b) => {
		const rankDifference = rankValue(a.rank) - rankValue(b.rank)
		return rankDifference || a.suit.localeCompare(b.suit)
	})
}

export function groupByRank(cards: PlayingCard[]): Map<Rank, PlayingCard[]> {
	const groups = new Map<Rank, PlayingCard[]>()
	for (const rank of RANKS) groups.set(rank, [])
	for (const card of cards) groups.get(card.rank)?.push(card)
	return groups
}

export function chooseComputerPlay(
	hand: PlayingCard[],
	activeRank: Rank | null,
	activeCount: number,
): PlayingCard[] | null {
	const groups = groupByRank(hand)

	if (!activeRank) {
		const opening = RANKS
			.map((rank) => groups.get(rank) ?? [])
			.filter((cards) => cards.length > 0)
			.sort((a, b) => b.length - a.length || rankValue(a[0]!.rank) - rankValue(b[0]!.rank))[0]
		return opening ? [...opening] : null
	}

	const matching = groups.get(activeRank) ?? []
	if (matching.length > 0) return [...matching]

	for (const rank of RANKS) {
		if (rankValue(rank) <= rankValue(activeRank)) continue
		const group = groups.get(rank) ?? []
		if (group.length >= activeCount) return group.slice(0, activeCount)
	}

	return null
}

