import { describe, expect, it } from 'vitest'
import { createDeck, isLegalPlay, type PlayingCard } from './card-game'

const card = (rank: PlayingCard['rank'], index = 0): PlayingCard => ({
	id: `${rank}-${index}`,
	rank,
	suit: 'spades',
})

describe('card game rules', () => {
	it('builds a standard 52-card deck', () => {
		expect(createDeck()).toHaveLength(52)
	})

	it('allows any same-rank opening set', () => {
		expect(isLegalPlay([card('7'), card('7', 1)], null, 0)).toBe(true)
		expect(isLegalPlay([card('7'), card('8')], null, 0)).toBe(false)
	})

	it('requires the exact active count when raising the rank', () => {
		expect(isLegalPlay([card('Q'), card('Q', 1)], '7', 2)).toBe(true)
		expect(isLegalPlay([card('Q'), card('Q', 1), card('Q', 2)], '7', 2)).toBe(false)
	})

	it('allows any number of the active rank to raise the play count', () => {
		expect(isLegalPlay([card('7')], '7', 2)).toBe(true)
		expect(isLegalPlay([card('7'), card('7', 1)], '7', 2)).toBe(true)
	})

	it('treats 3 as low and 2 as high', () => {
		expect(isLegalPlay([card('4')], '3', 1)).toBe(true)
		expect(isLegalPlay([card('2')], 'A', 1)).toBe(true)
		expect(isLegalPlay([card('3')], '2', 1)).toBe(false)
	})
})

