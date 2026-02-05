'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
	Play,
	Pause,
	Volume2,
	VolumeX,
	Maximize,
	Minimize,
	RotateCcw,
	Settings,
	Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoPlayerProps {
	src: string
	poster?: string
	title?: string
	className?: string
	autoPlay?: boolean
	muted?: boolean
	loop?: boolean
	controls?: boolean
}

/**
 * 通用视频播放器组件
 * 支持外部视频链接播放，样式极简现代
 */
export function VideoPlayer({
	src,
	poster,
	title,
	className,
	autoPlay = false,
	muted = false,
	loop = false,
	controls = true
}: VideoPlayerProps) {
	const videoRef = useRef<HTMLVideoElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const progressRef = useRef<HTMLDivElement>(null)
	const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)

	const [isPlaying, setIsPlaying] = useState(false)
	const [isMuted, setIsMuted] = useState(muted)
	const [volume, setVolume] = useState(1)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [buffered, setBuffered] = useState(0)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [showControls, setShowControls] = useState(true)
	const [isLoading, setIsLoading] = useState(true)
	const [hasError, setHasError] = useState(false)
	const [showVolumeSlider, setShowVolumeSlider] = useState(false)

	// 格式化时间
	const formatTime = (seconds: number) => {
		if (!seconds || isNaN(seconds)) return '0:00'
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	// 播放/暂停
	const togglePlay = useCallback(() => {
		const video = videoRef.current
		if (!video) return

		if (video.paused) {
			video.play().catch(console.error)
		} else {
			video.pause()
		}
	}, [])

	// 静音/取消静音
	const toggleMute = useCallback(() => {
		const video = videoRef.current
		if (!video) return

		video.muted = !video.muted
		setIsMuted(video.muted)
	}, [])

	// 音量变化
	const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const video = videoRef.current
		if (!video) return

		const newVolume = parseFloat(e.target.value)
		video.volume = newVolume
		setVolume(newVolume)

		if (newVolume === 0) {
			video.muted = true
			setIsMuted(true)
		} else if (video.muted) {
			video.muted = false
			setIsMuted(false)
		}
	}, [])

	// 进度条点击
	const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		const video = videoRef.current
		const progress = progressRef.current
		if (!video || !progress) return

		const rect = progress.getBoundingClientRect()
		const percent = (e.clientX - rect.left) / rect.width
		video.currentTime = percent * video.duration
	}, [])

	// 全屏切换
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

	// 重播
	const handleReplay = useCallback(() => {
		const video = videoRef.current
		if (!video) return

		video.currentTime = 0
		video.play().catch(console.error)
	}, [])

	// 自动隐藏控制栏
	const resetHideControlsTimer = useCallback(() => {
		if (hideControlsTimeout.current) {
			clearTimeout(hideControlsTimeout.current)
		}

		setShowControls(true)

		if (isPlaying) {
			hideControlsTimeout.current = setTimeout(() => {
				setShowControls(false)
			}, 3000)
		}
	}, [isPlaying])

	// 事件监听
	useEffect(() => {
		const video = videoRef.current
		if (!video) return

		const handlePlay = () => setIsPlaying(true)
		const handlePause = () => setIsPlaying(false)
		const handleTimeUpdate = () => {
			setCurrentTime(video.currentTime)
			// 更新缓冲进度
			if (video.buffered.length > 0) {
				setBuffered(video.buffered.end(video.buffered.length - 1))
			}
		}
		const handleLoadedMetadata = () => {
			setDuration(video.duration)
			setIsLoading(false)
		}
		const handleWaiting = () => setIsLoading(true)
		const handlePlaying = () => setIsLoading(false)
		const handleError = () => {
			setHasError(true)
			setIsLoading(false)
		}

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

	// 全屏状态监听
	useEffect(() => {
		const handleFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement)
		}

		document.addEventListener('fullscreenchange', handleFullscreenChange)
		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange)
		}
	}, [])

	// 清理定时器
	useEffect(() => {
		return () => {
			if (hideControlsTimeout.current) {
				clearTimeout(hideControlsTimeout.current)
			}
		}
	}, [])

	// 键盘控制
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			const video = videoRef.current
			if (!video) return

			switch (e.key) {
				case ' ':
				case 'k':
					e.preventDefault()
					togglePlay()
					break
				case 'f':
					e.preventDefault()
					toggleFullscreen()
					break
				case 'm':
					e.preventDefault()
					toggleMute()
					break
				case 'ArrowLeft':
					e.preventDefault()
					video.currentTime = Math.max(0, video.currentTime - 5)
					break
				case 'ArrowRight':
					e.preventDefault()
					video.currentTime = Math.min(video.duration, video.currentTime + 5)
					break
				case 'ArrowUp':
					e.preventDefault()
					video.volume = Math.min(1, video.volume + 0.1)
					setVolume(video.volume)
					break
				case 'ArrowDown':
					e.preventDefault()
					video.volume = Math.max(0, video.volume - 0.1)
					setVolume(video.volume)
					break
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => {
			document.removeEventListener('keydown', handleKeyDown)
		}
	}, [togglePlay, toggleFullscreen, toggleMute])

	const progress = duration > 0 ? (currentTime / duration) * 100 : 0
	const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0

	if (hasError) {
		return (
			<div className={cn('relative flex aspect-video items-center justify-center rounded-2xl bg-black/10', className)}>
				<div className='text-center'>
					<p className='text-secondary mb-2 text-sm'>视频加载失败</p>
					<p className='text-secondary/60 text-xs'>请检查链接是否有效</p>
				</div>
			</div>
		)
	}

	return (
		<div
			ref={containerRef}
			className={cn(
				'group relative overflow-hidden rounded-2xl bg-black',
				isFullscreen ? 'h-screen w-screen' : 'aspect-video',
				className
			)}
			onMouseMove={resetHideControlsTimer}
			onMouseLeave={() => isPlaying && setShowControls(false)}
		>
			{/* 视频元素 */}
			<video
				ref={videoRef}
				src={src}
				poster={poster}
				autoPlay={autoPlay}
				muted={muted}
				loop={loop}
				playsInline
				className='h-full w-full object-contain'
				onClick={togglePlay}
			/>

			{/* 加载指示器 */}
			<AnimatePresence>
				{isLoading && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className='absolute inset-0 flex items-center justify-center bg-black/20'
					>
						<div className='h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white' />
					</motion.div>
				)}
			</AnimatePresence>

			{/* 中央播放按钮 */}
			<AnimatePresence>
				{!isPlaying && !isLoading && (
					<motion.button
						initial={{ opacity: 0, scale: 0.8 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.8 }}
						onClick={togglePlay}
						className='absolute inset-0 flex items-center justify-center'
					>
						<div className='bg-brand/90 flex h-16 w-16 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-transform hover:scale-110'>
							<Play className='ml-1 h-8 w-8 text-white' />
						</div>
					</motion.button>
				)}
			</AnimatePresence>

			{/* 控制栏 */}
			{controls && (
				<AnimatePresence>
					{showControls && (
						<motion.div
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 10 }}
							className='absolute inset-x-0 bottom-0 p-4 pt-12'
							style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.4), transparent)' }}
						>
							{/* 标题 */}
							{title && (
								<div className='mb-3 truncate text-sm font-medium text-white'>
									{title}
								</div>
							)}

							{/* 进度条 */}
							<div
								ref={progressRef}
								className='group/progress mb-3 h-1 cursor-pointer rounded-full bg-white/30'
								onClick={handleProgressClick}
							>
								{/* 缓冲进度 */}
								<div
									className='absolute h-1 rounded-full bg-white/30'
									style={{ width: `${bufferedPercent}%` }}
								/>
								{/* 播放进度 */}
								<div
									className='bg-brand relative h-full rounded-full transition-all'
									style={{ width: `${progress}%` }}
								>
									{/* 进度点 */}
									<div className='bg-brand absolute -right-1.5 -top-1 h-3 w-3 rounded-full opacity-0 shadow-md transition-opacity group-hover/progress:opacity-100' />
								</div>
							</div>

							{/* 控制按钮 */}
							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-3'>
									{/* 播放/暂停 */}
									<motion.button
										whileHover={{ scale: 1.1 }}
										whileTap={{ scale: 0.9 }}
										onClick={togglePlay}
										className='text-white transition-colors hover:text-white/80'
									>
										{isPlaying ? (
											<Pause className='h-5 w-5' />
										) : (
											<Play className='h-5 w-5' />
										)}
									</motion.button>

									{/* 重播 */}
									<motion.button
										whileHover={{ scale: 1.1 }}
										whileTap={{ scale: 0.9 }}
										onClick={handleReplay}
										className='text-white/70 transition-colors hover:text-white'
									>
										<RotateCcw className='h-4 w-4' />
									</motion.button>

									{/* 音量 */}
									<div
										className='relative flex items-center'
										onMouseEnter={() => setShowVolumeSlider(true)}
										onMouseLeave={() => setShowVolumeSlider(false)}
									>
										<motion.button
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.9 }}
											onClick={toggleMute}
											className='text-white/70 transition-colors hover:text-white'
										>
											{isMuted || volume === 0 ? (
												<VolumeX className='h-5 w-5' />
											) : (
												<Volume2 className='h-5 w-5' />
											)}
										</motion.button>

										<AnimatePresence>
											{showVolumeSlider && (
												<motion.div
													initial={{ opacity: 0, width: 0 }}
													animate={{ opacity: 1, width: 80 }}
													exit={{ opacity: 0, width: 0 }}
													className='ml-2 overflow-hidden'
												>
													<input
														type='range'
														min='0'
														max='1'
														step='0.01'
														value={isMuted ? 0 : volume}
														onChange={handleVolumeChange}
														className='h-1 w-full cursor-pointer appearance-none rounded-full bg-white/30 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white'
													/>
												</motion.div>
											)}
										</AnimatePresence>
									</div>

									{/* 时间显示 */}
									<span className='text-xs text-white/70'>
										{formatTime(currentTime)} / {formatTime(duration)}
									</span>
								</div>

								<div className='flex items-center gap-3'>
									{/* 全屏 */}
									<motion.button
										whileHover={{ scale: 1.1 }}
										whileTap={{ scale: 0.9 }}
										onClick={toggleFullscreen}
										className='text-white/70 transition-colors hover:text-white'
									>
										{isFullscreen ? (
											<Minimize className='h-5 w-5' />
										) : (
											<Maximize className='h-5 w-5' />
										)}
									</motion.button>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			)}
		</div>
	)
}

/**
 * 视频嵌入适配器
 * 支持解析常见视频平台链接
 */
interface VideoAdapterProps {
	url: string
	title?: string
	className?: string
}

export function VideoAdapter({ url, title, className }: VideoAdapterProps) {
	// 检测是否为 iframe 嵌入代码
	if (url.includes('<iframe')) {
		return (
			<div
				className={cn('aspect-video overflow-hidden rounded-2xl', className)}
				dangerouslySetInnerHTML={{ __html: url }}
			/>
		)
	}

	// 检测 Bilibili 链接
	const bilibiliMatch = url.match(/bilibili\.com\/video\/(BV\w+)/)
	if (bilibiliMatch) {
		const bvid = bilibiliMatch[1]
		return (
			<div className={cn('aspect-video overflow-hidden rounded-2xl', className)}>
				<iframe
					src={`//player.bilibili.com/player.html?bvid=${bvid}&high_quality=1`}
					scrolling='no'
					frameBorder='0'
					allowFullScreen
					className='h-full w-full'
				/>
			</div>
		)
	}

	// 检测 YouTube 链接
	const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
	if (youtubeMatch) {
		const videoId = youtubeMatch[1]
		return (
			<div className={cn('aspect-video overflow-hidden rounded-2xl', className)}>
				<iframe
					src={`https://www.youtube.com/embed/${videoId}`}
					frameBorder='0'
					allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
					allowFullScreen
					className='h-full w-full'
				/>
			</div>
		)
	}

	// 检测直接视频链接
	const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v']
	const isDirectVideo = videoExtensions.some(ext => url.toLowerCase().includes(ext))

	if (isDirectVideo) {
		return <VideoPlayer src={url} title={title} className={className} />
	}

	// 默认：尝试作为直接视频链接播放
	return <VideoPlayer src={url} title={title} className={className} />
}
