'use client'

import { Suspense, useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import {
	Play,
	Pause,
	Volume2,
	VolumeX,
	Maximize,
	Minimize,
	RotateCcw,
	Download,
	AlertCircle,
	SkipBack,
	SkipForward,
	Music,
	Copy,
	Check,
	FileText,
	Settings
} from 'lucide-react'
import Hls from 'hls.js'
import { cn } from '@/lib/utils'

// 支持的文件类型
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'm3u8']
const AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a']
const PDF_EXTENSIONS = ['pdf']
const WORD_EXTENSIONS = ['doc', 'docx']
const TEXT_EXTENSIONS = ['txt']

type FileType = 'video' | 'audio' | 'pdf' | 'word' | 'text' | 'unknown'

/**
 * URL 智能清洗函数
 * 修复双重拼接问题：https://domain/file/https://domain/file/xxx
 * 返回最后一个有效的完整 URL
 */
function sanitizeUrl(rawUrl: string): string {
	if (!rawUrl) return ''
	
	// 解码 URL（可能被多次编码）
	let url = rawUrl
	try {
		// 尝试解码，最多解码 3 次以处理多重编码
		for (let i = 0; i < 3; i++) {
			const decoded = decodeURIComponent(url)
			if (decoded === url) break
			url = decoded
		}
	} catch {
		// 解码失败则使用原始值
	}
	
	// 检测是否存在重复的 http:// 或 https://
	// 匹配模式：找到最后一个 https:// 或 http:// 开头的完整 URL
	const httpMatches = url.match(/https?:\/\/[^\s]+/g)
	
	if (httpMatches && httpMatches.length > 1) {
		// 存在多个 URL，取最后一个（最内层的有效 URL）
		url = httpMatches[httpMatches.length - 1]
	} else if (httpMatches && httpMatches.length === 1) {
		// 只有一个 URL，直接使用
		url = httpMatches[0]
	}
	
	// 清理可能的尾部垃圾字符
	url = url.replace(/["\s<>]+$/, '')
	
	return url
}

function getFileExtension(url: string): string {
	try {
		const pathname = new URL(url).pathname
		const ext = pathname.split('.').pop()?.toLowerCase() || ''
		return ext
	} catch {
		const ext = url.split('.').pop()?.toLowerCase() || ''
		return ext.split('?')[0] || ''
	}
}

function detectFileType(url: string): FileType {
	const ext = getFileExtension(url)
	
	if (VIDEO_EXTENSIONS.includes(ext)) return 'video'
	if (AUDIO_EXTENSIONS.includes(ext)) return 'audio'
	if (PDF_EXTENSIONS.includes(ext)) return 'pdf'
	if (WORD_EXTENSIONS.includes(ext)) return 'word'
	if (TEXT_EXTENSIONS.includes(ext)) return 'text'
	
	return 'unknown'
}

// ========== 视频播放器组件 ==========
function VideoPlayer({ 
	url, 
	title, 
	poster, 
	autoplay, 
	muted, 
	loop,
	onCopyLink 
}: { 
	url: string
	title: string
	poster?: string
	autoplay?: boolean
	muted?: boolean
	loop?: boolean
	onCopyLink: () => void
}) {
	const videoRef = useRef<HTMLVideoElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const progressRef = useRef<HTMLDivElement>(null)
	const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)
	const hlsRef = useRef<Hls | null>(null)

	const [isPlaying, setIsPlaying] = useState(false)
	const [isMuted, setIsMuted] = useState(muted || false)
	const [volume, setVolume] = useState(1)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [buffered, setBuffered] = useState(0)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [showControls, setShowControls] = useState(true)
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [showVolumeSlider, setShowVolumeSlider] = useState(false)
	const [playbackRate, setPlaybackRate] = useState(1)
	const [showSpeedMenu, setShowSpeedMenu] = useState(false)

	const formatTime = (seconds: number) => {
		if (!seconds || isNaN(seconds)) return '0:00'
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	// 初始化 HLS
	useEffect(() => {
		const video = videoRef.current
		if (!video || !url) return

		const isHls = url.includes('.m3u8')

		if (isHls && Hls.isSupported()) {
			const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
			hlsRef.current = hls
			hls.loadSource(url)
			hls.attachMedia(video)
			
			hls.on(Hls.Events.MANIFEST_PARSED, () => {
				setIsLoading(false)
				if (autoplay) video.play().catch(console.error)
			})

			hls.on(Hls.Events.ERROR, (_, data) => {
				if (data.fatal) {
					setHasError(true)
					setIsLoading(false)
				}
			})

			return () => {
				hls.destroy()
				hlsRef.current = null
			}
		} else if (video.canPlayType('application/vnd.apple.mpegurl') && isHls) {
			video.src = url
		} else {
			video.src = url
		}
	}, [url, autoplay])

	const togglePlay = useCallback(() => {
		const video = videoRef.current
		if (!video) return
		if (video.paused) video.play().catch(console.error)
		else video.pause()
	}, [])

	const toggleMute = useCallback(() => {
		const video = videoRef.current
		if (!video) return
		video.muted = !video.muted
		setIsMuted(video.muted)
	}, [])

	const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const video = videoRef.current
		if (!video) return
		const newVolume = parseFloat(e.target.value)
		video.volume = newVolume
		setVolume(newVolume)
		if (newVolume === 0) { video.muted = true; setIsMuted(true) }
		else if (video.muted) { video.muted = false; setIsMuted(false) }
	}, [])

	const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		const video = videoRef.current
		const progress = progressRef.current
		if (!video || !progress) return
		const rect = progress.getBoundingClientRect()
		const percent = (e.clientX - rect.left) / rect.width
		video.currentTime = percent * video.duration
	}, [])

	const toggleFullscreen = useCallback(async () => {
		const container = containerRef.current
		if (!container) return
		try {
			if (!document.fullscreenElement) {
				await container.requestFullscreen()
				setIsFullscreen(true)
			} else {
				await document.exitFullscreen()
				setIsFullscreen(false)
			}
		} catch (error) {
			console.error('Fullscreen error:', error)
		}
	}, [])

	const handleReplay = useCallback(() => {
		const video = videoRef.current
		if (!video) return
		video.currentTime = 0
		video.play().catch(console.error)
	}, [])

	const handleSpeedChange = useCallback((speed: number) => {
		const video = videoRef.current
		if (!video) return
		video.playbackRate = speed
		setPlaybackRate(speed)
		setShowSpeedMenu(false)
	}, [])

	const resetHideControlsTimer = useCallback(() => {
		if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current)
		setShowControls(true)
		if (isPlaying) {
			hideControlsTimeout.current = setTimeout(() => setShowControls(false), 3000)
		}
	}, [isPlaying])

	useEffect(() => {
		const video = videoRef.current
		if (!video) return

		const handlePlay = () => setIsPlaying(true)
		const handlePause = () => setIsPlaying(false)
		const handleTimeUpdate = () => {
			setCurrentTime(video.currentTime)
			if (video.buffered.length > 0) setBuffered(video.buffered.end(video.buffered.length - 1))
		}
		const handleLoadedMetadata = () => { setDuration(video.duration); setIsLoading(false) }
		const handleWaiting = () => setIsLoading(true)
		const handlePlaying = () => setIsLoading(false)
		const handleError = () => { setHasError(true); setIsLoading(false) }

		video.addEventListener('play', handlePlay)
		video.addEventListener('pause', handlePause)
		video.addEventListener('timeupdate', handleTimeUpdate)
		video.addEventListener('loadedmetadata', handleLoadedMetadata)
		video.addEventListener('waiting', handleWaiting)
		video.addEventListener('playing', handlePlaying)
		video.addEventListener('error', handleError)

		return () => {
			video.removeEventListener('play', handlePlay)
			video.removeEventListener('pause', handlePause)
			video.removeEventListener('timeupdate', handleTimeUpdate)
			video.removeEventListener('loadedmetadata', handleLoadedMetadata)
			video.removeEventListener('waiting', handleWaiting)
			video.removeEventListener('playing', handlePlaying)
			video.removeEventListener('error', handleError)
		}
	}, [])

	useEffect(() => {
		const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
		document.addEventListener('fullscreenchange', handleFullscreenChange)
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
	}, [])

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const video = videoRef.current
			if (!video) return
			switch (e.key) {
				case ' ': case 'k': e.preventDefault(); togglePlay(); break
				case 'f': e.preventDefault(); toggleFullscreen(); break
				case 'm': e.preventDefault(); toggleMute(); break
				case 'ArrowLeft': e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); break
				case 'ArrowRight': e.preventDefault(); video.currentTime = Math.min(video.duration, video.currentTime + 5); break
			}
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [togglePlay, toggleFullscreen, toggleMute])

	useEffect(() => {
		return () => { if (hideControlsTimeout.current) clearTimeout(hideControlsTimeout.current) }
	}, [])

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0
	const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0

	if (hasError) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-black text-white">
				<div className="text-center">
					<AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
					<p className="text-lg">视频加载失败</p>
					<a href={url} target="_blank" className="mt-4 inline-block rounded-lg bg-white/10 px-6 py-3 hover:bg-white/20">
						<Download className="mr-2 inline h-5 w-5" />点击下载
					</a>
				</div>
			</div>
		)
	}

	return (
		<div
			ref={containerRef}
			className="relative h-screen w-screen bg-black"
			onMouseMove={resetHideControlsTimer}
			onMouseLeave={() => isPlaying && setShowControls(false)}
		>
			<video
				ref={videoRef}
				poster={poster || undefined}
				autoPlay={autoplay}
				muted={muted}
				loop={loop}
				playsInline
				className="h-full w-full object-contain"
				onClick={togglePlay}
			/>

			<AnimatePresence>
				{isLoading && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 flex items-center justify-center bg-black/40">
						<div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{!isPlaying && !isLoading && (
					<motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={togglePlay} className="absolute inset-0 flex items-center justify-center">
						<div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 shadow-lg backdrop-blur-md transition-transform hover:scale-110">
							<Play className="ml-1 h-10 w-10 text-white" />
						</div>
					</motion.button>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{showControls && title && (
					<motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute inset-x-0 top-0 p-4" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }}>
						<h1 className="text-lg font-medium text-white">{title}</h1>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{showControls && (
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute inset-x-0 bottom-0 p-4 pt-16" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.4), transparent)' }}>
						<div ref={progressRef} className="group/progress relative mb-4 h-1 cursor-pointer rounded-full bg-white/20" onClick={handleProgressClick}>
							<div className="absolute inset-y-0 left-0 rounded-full bg-white/30" style={{ width: `${bufferedPercent}%` }} />
							<div className="absolute inset-y-0 left-0 rounded-full bg-white transition-all group-hover/progress:h-1.5" style={{ width: `${progress}%` }} />
							<div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover/progress:opacity-100" style={{ left: `calc(${progress}% - 8px)` }} />
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<button onClick={togglePlay} className="rounded-lg p-2 text-white transition-colors hover:bg-white/10">
									{isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
								</button>
								<button onClick={handleReplay} className="rounded-lg p-2 text-white transition-colors hover:bg-white/10">
									<RotateCcw className="h-5 w-5" />
								</button>
								<div className="relative flex items-center" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
									<button onClick={toggleMute} className="rounded-lg p-2 text-white transition-colors hover:bg-white/10">
										{isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
									</button>
									<AnimatePresence>
										{showVolumeSlider && (
											<motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 80 }} exit={{ opacity: 0, width: 0 }} className="ml-2 overflow-hidden">
												<input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white" />
											</motion.div>
										)}
									</AnimatePresence>
								</div>
								<span className="text-sm text-white/80">{formatTime(currentTime)} / {formatTime(duration)}</span>
							</div>

							<div className="flex items-center gap-2">
								{/* 倍速 */}
								<div className="relative">
									<button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="rounded-lg px-2 py-1 text-sm text-white transition-colors hover:bg-white/10">
										{playbackRate}x
									</button>
									<AnimatePresence>
										{showSpeedMenu && (
											<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute bottom-full right-0 mb-2 rounded-lg bg-black/80 p-2 backdrop-blur-md">
												{[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
													<button key={speed} onClick={() => handleSpeedChange(speed)} className={cn("block w-full rounded px-4 py-1 text-left text-sm text-white hover:bg-white/10", speed === playbackRate && "bg-white/20")}>
														{speed}x
													</button>
												))}
											</motion.div>
										)}
									</AnimatePresence>
								</div>
								<button onClick={onCopyLink} className="rounded-lg p-2 text-white transition-colors hover:bg-white/10" title="复制直链">
									<Copy className="h-5 w-5" />
								</button>
								<a href={url} target="_blank" className="rounded-lg p-2 text-white transition-colors hover:bg-white/10" title="下载">
									<Download className="h-5 w-5" />
								</a>
								<button onClick={toggleFullscreen} className="rounded-lg p-2 text-white transition-colors hover:bg-white/10">
									{isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
								</button>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	)
}

// ========== 音频播放器组件 ==========
function AudioPlayer({ 
	url, 
	title, 
	artist,
	cover,
	autoplay, 
	loop,
	onCopyLink 
}: { 
	url: string
	title: string
	artist?: string
	cover?: string
	autoplay?: boolean
	loop?: boolean
	onCopyLink: () => void
}) {
	const audioRef = useRef<HTMLAudioElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const animationRef = useRef<number | null>(null)
	const analyserRef = useRef<AnalyserNode | null>(null)
	const audioContextRef = useRef<AudioContext | null>(null)

	const [isPlaying, setIsPlaying] = useState(false)
	const [isMuted, setIsMuted] = useState(false)
	const [volume, setVolume] = useState(1)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)

	const formatTime = (seconds: number) => {
		if (!seconds || isNaN(seconds)) return '0:00'
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const initVisualizer = useCallback(() => {
		const audio = audioRef.current
		const canvas = canvasRef.current
		if (!audio || !canvas || audioContextRef.current) return

		try {
			const audioContext = new AudioContext()
			const analyser = audioContext.createAnalyser()
			const source = audioContext.createMediaElementSource(audio)
			source.connect(analyser)
			analyser.connect(audioContext.destination)
			analyser.fftSize = 256
			analyserRef.current = analyser
			audioContextRef.current = audioContext
		} catch (error) {
			console.error('Visualizer init error:', error)
		}
	}, [])

	const drawVisualizer = useCallback(() => {
		const canvas = canvasRef.current
		const analyser = analyserRef.current
		if (!canvas || !analyser) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const bufferLength = analyser.frequencyBinCount
		const dataArray = new Uint8Array(bufferLength)

		const draw = () => {
			animationRef.current = requestAnimationFrame(draw)
			analyser.getByteFrequencyData(dataArray)

			const width = canvas.width
			const height = canvas.height
			ctx.clearRect(0, 0, width, height)

			const barWidth = (width / bufferLength) * 2.5
			let x = 0

			for (let i = 0; i < bufferLength; i++) {
				const barHeight = (dataArray[i] / 255) * height
				const hue = (i / bufferLength) * 60 + 200
				ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`
				ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight)
				ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.3)`
				ctx.fillRect(x, 0, barWidth - 1, barHeight * 0.3)
				x += barWidth
			}
		}
		draw()
	}, [])

	const stopVisualizer = useCallback(() => {
		if (animationRef.current) {
			cancelAnimationFrame(animationRef.current)
			animationRef.current = null
		}
	}, [])

	const togglePlay = useCallback(() => {
		const audio = audioRef.current
		if (!audio) return

		if (!audioContextRef.current) initVisualizer()
		if (audioContextRef.current?.state === 'suspended') audioContextRef.current.resume()

		if (audio.paused) { audio.play().catch(console.error); drawVisualizer() }
		else { audio.pause(); stopVisualizer() }
	}, [initVisualizer, drawVisualizer, stopVisualizer])

	const toggleMute = useCallback(() => {
		const audio = audioRef.current
		if (!audio) return
		audio.muted = !audio.muted
		setIsMuted(audio.muted)
	}, [])

	const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const audio = audioRef.current
		if (!audio) return
		const newVolume = parseFloat(e.target.value)
		audio.volume = newVolume
		setVolume(newVolume)
		if (newVolume === 0) { audio.muted = true; setIsMuted(true) }
		else if (audio.muted) { audio.muted = false; setIsMuted(false) }
	}, [])

	const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		const audio = audioRef.current
		if (!audio) return
		const rect = e.currentTarget.getBoundingClientRect()
		const percent = (e.clientX - rect.left) / rect.width
		audio.currentTime = percent * audio.duration
	}, [])

	const handleSkip = useCallback((seconds: number) => {
		const audio = audioRef.current
		if (!audio) return
		audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds))
	}, [])

	useEffect(() => {
		const audio = audioRef.current
		if (!audio) return

		const handlePlay = () => setIsPlaying(true)
		const handlePause = () => setIsPlaying(false)
		const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
		const handleLoadedMetadata = () => { setDuration(audio.duration); setIsLoading(false) }
		const handleWaiting = () => setIsLoading(true)
		const handlePlaying = () => setIsLoading(false)
		const handleError = () => { setHasError(true); setIsLoading(false) }
		const handleEnded = () => stopVisualizer()

		audio.addEventListener('play', handlePlay)
		audio.addEventListener('pause', handlePause)
		audio.addEventListener('timeupdate', handleTimeUpdate)
		audio.addEventListener('loadedmetadata', handleLoadedMetadata)
		audio.addEventListener('waiting', handleWaiting)
		audio.addEventListener('playing', handlePlaying)
		audio.addEventListener('error', handleError)
		audio.addEventListener('ended', handleEnded)

		return () => {
			audio.removeEventListener('play', handlePlay)
			audio.removeEventListener('pause', handlePause)
			audio.removeEventListener('timeupdate', handleTimeUpdate)
			audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
			audio.removeEventListener('waiting', handleWaiting)
			audio.removeEventListener('playing', handlePlaying)
			audio.removeEventListener('error', handleError)
			audio.removeEventListener('ended', handleEnded)
		}
	}, [stopVisualizer])

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			switch (e.key) {
				case ' ': case 'k': e.preventDefault(); togglePlay(); break
				case 'm': e.preventDefault(); toggleMute(); break
				case 'ArrowLeft': e.preventDefault(); handleSkip(-5); break
				case 'ArrowRight': e.preventDefault(); handleSkip(5); break
			}
		}
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [togglePlay, toggleMute, handleSkip])

	useEffect(() => {
		return () => {
			stopVisualizer()
			if (audioContextRef.current) audioContextRef.current.close()
		}
	}, [stopVisualizer])

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0

	if (hasError) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-linear-to-br from-gray-900 to-black text-white">
				<div className="text-center">
					<AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
					<p className="text-lg">音频加载失败</p>
					<a href={url} target="_blank" className="mt-4 inline-block rounded-lg bg-white/10 px-6 py-3 hover:bg-white/20">
						<Download className="mr-2 inline h-5 w-5" />点击下载
					</a>
				</div>
			</div>
		)
	}

	return (
		<div className="relative flex h-screen w-screen flex-col items-center justify-center bg-linear-to-br from-gray-900 via-purple-950/30 to-black p-8">
			<canvas ref={canvasRef} width={800} height={300} className="absolute inset-0 h-full w-full opacity-50" />
			<audio ref={audioRef} src={url} autoPlay={autoplay} loop={loop} preload="metadata" />

			<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex w-full max-w-md flex-col items-center rounded-3xl bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
				<motion.div animate={{ rotate: isPlaying ? 360 : 0 }} transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} className="relative mb-6 h-48 w-48 overflow-hidden rounded-full bg-linear-to-br from-purple-500 to-blue-500 shadow-lg">
					{cover ? <img src={cover} alt={title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Music className="h-20 w-20 text-white/60" /></div>}
					<div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900 shadow-inner" />
				</motion.div>

				<h1 className="mb-1 text-xl font-bold text-white">{title}</h1>
				{artist && <p className="mb-6 text-sm text-white/60">{artist}</p>}

				<div className="mb-4 w-full">
					<div className="group relative h-2 cursor-pointer rounded-full bg-white/10" onClick={handleProgressClick}>
						<div className="absolute inset-y-0 left-0 rounded-full bg-linear-to-r from-purple-500 to-blue-500 transition-all" style={{ width: `${progress}%` }} />
						<div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100" style={{ left: `calc(${progress}% - 8px)` }} />
					</div>
					<div className="mt-2 flex justify-between text-xs text-white/60">
						<span>{formatTime(currentTime)}</span>
						<span>{formatTime(duration)}</span>
					</div>
				</div>

				<div className="flex items-center gap-4">
					<button onClick={() => handleSkip(-10)} className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"><SkipBack className="h-5 w-5" /></button>
					<button onClick={togglePlay} className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-r from-purple-500 to-blue-500 text-white shadow-lg transition-transform hover:scale-105">
						{isLoading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : isPlaying ? <Pause className="h-8 w-8" /> : <Play className="ml-1 h-8 w-8" />}
					</button>
					<button onClick={() => handleSkip(10)} className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"><SkipForward className="h-5 w-5" /></button>
				</div>

				<div className="mt-6 flex w-full items-center justify-between">
					<div className="flex items-center gap-2">
						<button onClick={toggleMute} className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white">
							{isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
						</button>
						<input type="range" min="0" max="1" step="0.01" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white" />
					</div>
					<div className="flex items-center gap-2">
						<button onClick={onCopyLink} className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white" title="复制直链"><Copy className="h-5 w-5" /></button>
						<a href={url} target="_blank" className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white" title="下载"><Download className="h-5 w-5" /></a>
					</div>
				</div>
			</motion.div>
		</div>
	)
}

// ========== 文档查看器组件 ==========
function DocumentViewer({ url, title, type, onCopyLink }: { url: string; title: string; type: 'pdf' | 'word' | 'text'; onCopyLink: () => void }) {
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [supportsPdf, setSupportsPdf] = useState(true)

	useEffect(() => {
		if (type !== 'pdf') return
		if (typeof navigator === 'undefined') return
		const mimeTypes = navigator.mimeTypes
		const canEmbedPdf = !!mimeTypes && !!mimeTypes.namedItem('application/pdf')
		setSupportsPdf(canEmbedPdf)
	}, [type])

	// Word 文档使用 Microsoft Office Online Viewer
	const iframeSrc = type === 'word' 
		? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
		: url
	const iframeSandbox = type === 'word' ? undefined : 'allow-same-origin allow-scripts allow-popups allow-downloads allow-forms'

	return (
		<div className="flex h-screen w-screen flex-col bg-gray-900">
			{/* 标题栏 */}
			<div className="flex items-center justify-between bg-gray-800 px-4 py-3">
				<div className="flex items-center gap-3">
					<FileText className="h-5 w-5 text-white/70" />
					<h1 className="text-lg font-medium text-white">{title}</h1>
				</div>
				<div className="flex items-center gap-2">
					<button onClick={onCopyLink} className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white" title="复制直链">
						<Copy className="h-5 w-5" />
					</button>
					<a href={url} target="_blank" className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white" title="下载">
						<Download className="h-5 w-5" />
					</a>
				</div>
			</div>

			{/* 文档内容 */}
			<div className="relative flex-1">
				{isLoading && (
					<div className="absolute inset-0 flex items-center justify-center bg-gray-900">
						<div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
					</div>
				)}
				{hasError || (type === 'pdf' && !supportsPdf) ? (
					<div className="flex h-full items-center justify-center text-white">
						<div className="text-center">
							<AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
							<p className="text-lg">浏览器不支持直接预览</p>
							<p className="mt-2 text-sm text-white/60">请点击下方按钮打开或下载文件</p>
							<a href={url} target="_blank" className="mt-4 inline-block rounded-lg bg-white/10 px-6 py-3 hover:bg-white/20">
								<Download className="mr-2 inline h-5 w-5" />点击下载
							</a>
						</div>
					</div>
				) : type === 'pdf' ? (
					<object
						data={url}
						type="application/pdf"
						className="h-full w-full"
						onLoad={() => setIsLoading(false)}
						onError={() => { setHasError(true); setIsLoading(false) }}
						aria-label={title}
					>
						<div className="flex h-full items-center justify-center text-white">
							<div className="text-center">
								<AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
								<p className="text-lg">无法嵌入预览</p>
								<a href={url} target="_blank" className="mt-4 inline-block rounded-lg bg-white/10 px-6 py-3 hover:bg-white/20">
									<Download className="mr-2 inline h-5 w-5" />点击下载
								</a>
							</div>
						</div>
					</object>
				) : (
					<iframe
						src={iframeSrc}
						className="h-full w-full border-0"
						onLoad={() => setIsLoading(false)}
						onError={() => { setHasError(true); setIsLoading(false) }}
						title={title}
						sandbox={iframeSandbox}
					/>
				)}
			</div>
		</div>
	)
}

// ========== 未知格式兜底组件 ==========
function UnknownFormat({ url, title }: { url: string; title: string }) {
	return (
		<div className="flex h-screen w-screen items-center justify-center bg-gray-900">
			<div className="text-center">
				<FileText className="mx-auto mb-4 h-16 w-16 text-white/40" />
				<h2 className="mb-2 text-xl font-medium text-white">{title || '未知文件'}</h2>
				<p className="mb-6 text-white/60">此格式不支持在线预览</p>
				<a 
					href={url} 
					target="_blank"
					className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-white transition-colors hover:bg-white/20"
				>
					<Download className="h-5 w-5" />
					<span>点击下载</span>
				</a>
			</div>
		</div>
	)
}

// ========== 主预览组件 ==========
function PreviewContent() {
	const searchParams = useSearchParams()
	
	// 获取原始参数并进行 URL 清洗
	const rawUrl = searchParams.get('url') || ''
	const url = sanitizeUrl(rawUrl) // 清洗后的有效 URL
	
	const title = searchParams.get('title') || '预览'
	const rawPoster = searchParams.get('poster') || ''
	const poster = sanitizeUrl(rawPoster) // 封面也需要清洗
	const rawCover = searchParams.get('cover') || ''
	const cover = sanitizeUrl(rawCover) // 封面也需要清洗
	const artist = searchParams.get('artist') || ''
	const autoplay = searchParams.get('autoplay') === '1'
	const muted = searchParams.get('muted') === '1'
	const loop = searchParams.get('loop') === '1'
	// 支持强制指定类型
	const forceType = searchParams.get('type') as FileType | null
	
	const [copied, setCopied] = useState(false)

	// 复制的是清洗后的直链
	const handleCopyLink = useCallback(() => {
		if (url) {
			navigator.clipboard.writeText(url).then(() => {
				setCopied(true)
				setTimeout(() => setCopied(false), 2000)
			})
		}
	}, [url])

	// 无 URL
	if (!url) {
		return (
			<div className="flex h-screen w-screen items-center justify-center bg-gray-900 text-white">
				<div className="text-center">
					<AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
					<p className="text-lg">未指定文件 URL</p>
					<p className="mt-2 text-sm text-white/60">请在 URL 参数中提供 ?url=FILE_URL</p>
				</div>
			</div>
		)
	}

	const fileType = forceType || detectFileType(url)

	// 复制成功提示
	const CopyToast = copied && (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			exit={{ opacity: 0, y: 20 }}
			className="fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-full bg-green-500/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm"
		>
			<Check className="mr-2 inline h-4 w-4" />
			链接已复制
		</motion.div>
	)

	switch (fileType) {
		case 'video':
			return (
				<>
					<VideoPlayer url={url} title={title} poster={poster} autoplay={autoplay} muted={muted} loop={loop} onCopyLink={handleCopyLink} />
					<AnimatePresence>{CopyToast}</AnimatePresence>
				</>
			)
		case 'audio':
			return (
				<>
					<AudioPlayer url={url} title={title} artist={artist} cover={cover} autoplay={autoplay} loop={loop} onCopyLink={handleCopyLink} />
					<AnimatePresence>{CopyToast}</AnimatePresence>
				</>
			)
		case 'pdf':
		case 'text':
			return (
				<>
					<DocumentViewer url={url} title={title} type={fileType} onCopyLink={handleCopyLink} />
					<AnimatePresence>{CopyToast}</AnimatePresence>
				</>
			)
		case 'word':
			return (
				<>
					<DocumentViewer url={url} title={title} type="word" onCopyLink={handleCopyLink} />
					<AnimatePresence>{CopyToast}</AnimatePresence>
				</>
			)
		default:
			return <UnknownFormat url={url} title={title} />
	}
}

export default function PreviewPage() {
	return (
		<Suspense
			fallback={
				<div className="flex h-screen w-screen items-center justify-center bg-gray-900">
					<div className="h-12 w-12 animate-spin rounded-full border-4 border-white/30 border-t-white" />
				</div>
			}
		>
			<PreviewContent />
		</Suspense>
	)
}
