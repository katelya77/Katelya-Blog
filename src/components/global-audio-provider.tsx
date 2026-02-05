'use client'

import { useEffect, useRef } from 'react'
import { useMusicPlayerStore } from '@/stores/music-player-store'

/**
 * 全局音频管理器组件
 * 此组件不渲染任何 UI，只负责管理全局 Audio 元素
 * 放置在 Layout 中，确保路由切换时不会销毁
 */
export function GlobalAudioProvider() {
	const audioRef = useRef<HTMLAudioElement | null>(null)
	const {
		setAudioRef,
		setProgress,
		setDuration,
		nextTrack,
		isPlaying,
		currentTrack,
		volume
	} = useMusicPlayerStore()

	// 初始化 Audio 元素
	useEffect(() => {
		if (!audioRef.current) {
			audioRef.current = new Audio()
			audioRef.current.volume = volume
		}

		const audio = audioRef.current
		setAudioRef(audio)

		const handleTimeUpdate = () => {
			setProgress(audio.currentTime)
		}

		const handleLoadedMetadata = () => {
			setDuration(audio.duration)
		}

		const handleEnded = () => {
			nextTrack()
		}

		const handlePlay = () => {
			useMusicPlayerStore.setState({ isPlaying: true })
		}

		const handlePause = () => {
			useMusicPlayerStore.setState({ isPlaying: false })
		}

		audio.addEventListener('timeupdate', handleTimeUpdate)
		audio.addEventListener('loadedmetadata', handleLoadedMetadata)
		audio.addEventListener('ended', handleEnded)
		audio.addEventListener('play', handlePlay)
		audio.addEventListener('pause', handlePause)

		return () => {
			audio.removeEventListener('timeupdate', handleTimeUpdate)
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
			audio.removeEventListener('ended', handleEnded)
			audio.removeEventListener('play', handlePlay)
			audio.removeEventListener('pause', handlePause)
		}
	}, [setAudioRef, setProgress, setDuration, nextTrack, volume])

	// 当 currentTrack 变化时加载新音频
	useEffect(() => {
		const audio = audioRef.current
		if (!audio || !currentTrack) return

		if (audio.src !== currentTrack.url) {
			audio.src = currentTrack.url

			if (isPlaying) {
				audio.play().catch(console.error)
			}
		}
	}, [currentTrack, isPlaying])

	// 同步音量变化
	useEffect(() => {
		if (audioRef.current) {
			audioRef.current.volume = volume
		}
	}, [volume])

	return null
}
