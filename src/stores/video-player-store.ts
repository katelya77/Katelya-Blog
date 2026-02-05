'use client'

import { create } from 'zustand'

export interface VideoItem {
	id: string
	name: string
	url: string
	isCustom?: boolean
}

interface VideoPlayerStore {
	// 视频列表
	playlist: VideoItem[]
	currentVideo: VideoItem | null
	currentIndex: number
	isPlaylistLoaded: boolean
	hasUnsavedChanges: boolean

	// Actions
	setPlaylist: (videos: VideoItem[]) => void
	setCurrentVideo: (video: VideoItem | null) => void
	setCurrentIndex: (index: number) => void
	addVideo: (url: string, name?: string) => void
	addVideos: (videos: { url: string; name?: string }[]) => void
	removeVideo: (id: string) => void
	updateVideo: (id: string, updates: Partial<VideoItem>) => void
	reorderVideos: (videos: VideoItem[]) => void
	markAsSaved: () => void
	playVideo: (index: number) => void
	playNext: () => void
	playPrev: () => void
}

const generateId = () => Math.random().toString(36).substring(2, 9)

const extractVideoName = (url: string): string => {
	try {
		const urlObj = new URL(url)
		const pathParts = urlObj.pathname.split('/').filter(Boolean)
		const filename = pathParts[pathParts.length - 1] || ''
		// 移除扩展名
		const nameWithoutExt = filename.replace(/\.(mp4|m3u8|webm|mkv|avi|mov)$/i, '')
		return decodeURIComponent(nameWithoutExt) || `视频 ${Date.now()}`
	} catch {
		return `视频 ${Date.now()}`
	}
}

export const useVideoPlayerStore = create<VideoPlayerStore>((set, get) => ({
	playlist: [],
	currentVideo: null,
	currentIndex: 0,
	isPlaylistLoaded: false,
	hasUnsavedChanges: false,

	setPlaylist: (videos) => set({ playlist: videos, isPlaylistLoaded: true }),

	setCurrentVideo: (video) => set({ currentVideo: video }),

	setCurrentIndex: (index) => {
		const { playlist } = get()
		if (index >= 0 && index < playlist.length) {
			set({ currentIndex: index, currentVideo: playlist[index] })
		}
	},

	addVideo: (url, name) => {
		const newVideo: VideoItem = {
			id: generateId(),
			name: name || extractVideoName(url),
			url,
			isCustom: true
		}
		set(state => ({
			playlist: [...state.playlist, newVideo],
			hasUnsavedChanges: true
		}))
	},

	addVideos: (videos) => {
		const newVideos: VideoItem[] = videos.map(v => ({
			id: generateId(),
			name: v.name || extractVideoName(v.url),
			url: v.url,
			isCustom: true
		}))
		set(state => ({
			playlist: [...state.playlist, ...newVideos],
			hasUnsavedChanges: true
		}))
	},

	removeVideo: (id) => {
		set(state => {
			const newPlaylist = state.playlist.filter(v => v.id !== id)
			let newIndex = state.currentIndex
			let newCurrent = state.currentVideo

			if (state.currentVideo?.id === id) {
				newIndex = Math.min(state.currentIndex, newPlaylist.length - 1)
				newCurrent = newPlaylist[newIndex] || null
			}

			return {
				playlist: newPlaylist,
				currentIndex: newIndex,
				currentVideo: newCurrent,
				hasUnsavedChanges: true
			}
		})
	},

	updateVideo: (id, updates) => {
		set(state => ({
			playlist: state.playlist.map(v =>
				v.id === id ? { ...v, ...updates } : v
			),
			currentVideo: state.currentVideo?.id === id
				? { ...state.currentVideo, ...updates }
				: state.currentVideo,
			hasUnsavedChanges: true
		}))
	},

	reorderVideos: (videos) => {
		set({ playlist: videos, hasUnsavedChanges: true })
	},

	markAsSaved: () => set({ hasUnsavedChanges: false }),

	playVideo: (index) => {
		const { playlist } = get()
		if (index >= 0 && index < playlist.length) {
			set({ currentIndex: index, currentVideo: playlist[index] })
		}
	},

	playNext: () => {
		const { playlist, currentIndex } = get()
		if (playlist.length === 0) return
		const nextIndex = (currentIndex + 1) % playlist.length
		set({ currentIndex: nextIndex, currentVideo: playlist[nextIndex] })
	},

	playPrev: () => {
		const { playlist, currentIndex } = get()
		if (playlist.length === 0) return
		const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1
		set({ currentIndex: prevIndex, currentVideo: playlist[prevIndex] })
	}
}))
