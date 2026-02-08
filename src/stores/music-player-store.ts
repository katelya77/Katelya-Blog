'use client'

import { create } from 'zustand'

export interface MusicTrack {
	id: string
	name: string
	url: string
	isCustom?: boolean
}

interface MusicPlayerStore {
	// 播放状态
	isPlaying: boolean
	currentTrack: MusicTrack | null
	currentIndex: number
	progress: number
	duration: number
	volume: number

	// Playback Mode
	playMode: 'sequence' | 'loop' | 'shuffle'
	setPlayMode: (mode: 'sequence' | 'loop' | 'shuffle') => void

	// Actions
	setAudioRef: (ref: HTMLAudioElement | null) => void
	play: () => void
	pause: () => void
	toggle: () => void
	setProgress: (progress: number) => void
	setDuration: (duration: number) => void
	setVolume: (volume: number) => void
	setCurrentIndex: (index: number) => void
	setCurrentTrack: (track: MusicTrack | null) => void
	nextTrack: (isAuto?: boolean) => void
	prevTrack: () => void
	addTrack: (url: string, name?: string) => void
	removeTrack: (id: string) => void
	updateTrack: (id: string, updates: Partial<MusicTrack>) => void
	reorderTracks: (tracks: MusicTrack[]) => void
	setPlaylist: (tracks: MusicTrack[]) => void
	markAsSaved: () => void
	seekTo: (time: number) => void
}

const DEFAULT_TRACKS: MusicTrack[] = [
	{ id: 'christmas', name: '圣诞音乐', url: '/music/christmas.m4a', isCustom: false }
]

export const useMusicPlayerStore = create<MusicPlayerStore>((set, get) => ({
	isPlaying: false,
	currentTrack: null,
	currentIndex: 0,
	progress: 0,
	duration: 0,
	volume: 0.8,
	playlist: DEFAULT_TRACKS,
	isPlaylistLoaded: false,
	hasUnsavedChanges: false,
	audioRef: null,
	playMode: 'sequence',

	setPlayMode: (mode) => set({ playMode: mode }),

	setAudioRef: (ref) => set({ audioRef: ref }),

	play: () => {
		const { audioRef, currentTrack, playlist, currentIndex } = get()
		if (!audioRef) return

		// 如果没有当前曲目，设置第一首
		if (!currentTrack && playlist.length > 0) {
			const track = playlist[currentIndex] || playlist[0]
			set({ currentTrack: track })
			audioRef.src = track.url
		}

		audioRef.play().catch(console.error)
		set({ isPlaying: true })
	},

	pause: () => {
		const { audioRef } = get()
		if (audioRef) {
			audioRef.pause()
		}
		set({ isPlaying: false })
	},

	toggle: () => {
		const { isPlaying, play, pause } = get()
		if (isPlaying) {
			pause()
		} else {
			play()
		}
	},

	setProgress: (progress) => set({ progress }),

	setDuration: (duration) => set({ duration }),

	setVolume: (volume) => {
		const { audioRef } = get()
		if (audioRef) {
			audioRef.volume = volume
		}
		set({ volume })
	},

	setCurrentIndex: (index) => {
		const { playlist, audioRef, isPlaying } = get()
		if (index < 0 || index >= playlist.length) return

		const track = playlist[index]
		set({ currentIndex: index, currentTrack: track, progress: 0 })

		if (audioRef) {
			audioRef.src = track.url
			if (isPlaying) {
				audioRef.play().catch(console.error)
			}
		}
	},

	setCurrentTrack: (track) => set({ currentTrack: track }),

	nextTrack: (isAuto = false) => {
		const { currentIndex, playlist, setCurrentIndex, playMode } = get()
		if (playlist.length === 0) return

		let nextIndex = 0
		
		if (playMode === 'loop' && isAuto) {
			// In loop mode, auto-next repeats the current track
			// But we need to reset progress to 0 and play again
			// setCurrentIndex(currentIndex) will do that if we implement it right, 
			// checking inner logic of setCurrentIndex
			// actually setCurrentIndex sets progress to 0 and plays.
			nextIndex = currentIndex
		} else if (playMode === 'shuffle') {
			// Random index distinct from defined current if possible
			if (playlist.length > 1) {
				do {
					nextIndex = Math.floor(Math.random() * playlist.length)
				} while (nextIndex === currentIndex)
			}
		} else {
			// Sequence or Manual Loop (Next button click)
			nextIndex = (currentIndex + 1) % playlist.length
		}
		
		setCurrentIndex(nextIndex)
	},

	prevTrack: () => {
		const { currentIndex, playlist, setCurrentIndex, playMode } = get()
		if (playlist.length === 0) return

		let prevIndex = 0
        if (playMode === 'shuffle') {
             // Shuffle prev behavior is tricky without history. 
             // Simple version: Pick random. Better: Go to previous in list (User expectation usually).
             // Let's stick to sequence for Prev unless strict history is needed.
             // Or just random again? Random is annoying for Prev.
             // Let's use sequence for Prev even in shuffle mode for simplicity unless requested otherwise.
             prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1
        } else {
		     prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1
        }
		setCurrentIndex(prevIndex)
	},

	addTrack: (url, name) => {
		const id = `custom-${crypto.randomUUID()}`
		const trackName = name || `自定义音乐 ${get().playlist.filter(t => t.isCustom).length + 1}`
		const newTrack: MusicTrack = { id, name: trackName, url, isCustom: true }

		set(state => ({
			playlist: [...state.playlist, newTrack],
			hasUnsavedChanges: true
		}))
	},

	removeTrack: (id) => {
		set(state => {
			const newPlaylist = state.playlist.filter(t => t.id !== id)

			// 如果删除的是当前播放的曲目，切换到下一首
			if (state.currentTrack?.id === id) {
				const newIndex = state.currentIndex >= newPlaylist.length ? 0 : state.currentIndex
				const newCurrentTrack = newPlaylist[newIndex] || null

				return {
					playlist: newPlaylist,
					currentTrack: newCurrentTrack,
					currentIndex: newIndex,
					hasUnsavedChanges: true
				}
			}

			return {
				playlist: newPlaylist,
				hasUnsavedChanges: true
			}
		})
	},

	updateTrack: (id, updates) => {
		set(state => ({
			playlist: state.playlist.map(t => t.id === id ? { ...t, ...updates } : t),
			hasUnsavedChanges: true
		}))
	},

	reorderTracks: (tracks) => {
		set({ playlist: tracks, hasUnsavedChanges: true })
	},

	setPlaylist: (tracks) => {
		set({ playlist: tracks, isPlaylistLoaded: true, hasUnsavedChanges: false })
	},

	markAsSaved: () => {
		set({ hasUnsavedChanges: false })
	},

	seekTo: (time) => {
		const { audioRef } = get()
		if (audioRef) {
			audioRef.currentTime = time
		}
	}
}))
