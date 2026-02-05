'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { usePathname } from 'next/navigation'
import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, Plus, X, Music, ChevronUp, ChevronDown } from 'lucide-react'
import { useMusicPlayerStore } from '@/stores/music-player-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { SnowDecoration } from '@/components/snow-decoration'

/**
 * 悬浮迷你播放器组件
 * 在非首页时显示于右下角
 */
export function FloatingMiniPlayer() {
	const pathname = usePathname()
	const isHomePage = pathname === '/'

	const {
		isPlaying,
		currentTrack,
		progress,
		duration,
		volume,
		playlist,
		toggle,
		nextTrack,
		prevTrack,
		setVolume,
		seekTo,
		addTrack,
		play
	} = useMusicPlayerStore()

	const [isExpanded, setIsExpanded] = useState(false)
	const [showCustomInput, setShowCustomInput] = useState(false)
	const [customUrl, setCustomUrl] = useState('')
	const [customName, setCustomName] = useState('')
	const [isMuted, setIsMuted] = useState(false)
	const previousVolume = useRef(volume)

	// 在首页不显示悬浮播放器（首页有专门的音乐卡片）
	if (isHomePage) return null

	const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

	// 如果没有曲目，显示一个迷你入口按钮
	const showMiniButton = !currentTrack && !isPlaying

	const formatTime = (seconds: number) => {
		if (!seconds || isNaN(seconds)) return '0:00'
		const mins = Math.floor(seconds / 60)
		const secs = Math.floor(seconds % 60)
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect()
		const x = e.clientX - rect.left
		const percent = x / rect.width
		seekTo(percent * duration)
	}

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVolume = parseFloat(e.target.value)
		setVolume(newVolume)
		if (newVolume > 0) {
			setIsMuted(false)
		}
	}

	const toggleMute = () => {
		if (isMuted) {
			setVolume(previousVolume.current || 0.8)
			setIsMuted(false)
		} else {
			previousVolume.current = volume
			setVolume(0)
			setIsMuted(true)
		}
	}

	const handleAddCustomTrack = () => {
		if (!customUrl.trim()) {
			toast.error('请输入音频链接')
			return
		}

		try {
			new URL(customUrl)
		} catch {
			toast.error('请输入有效的链接')
			return
		}

		addTrack(customUrl.trim(), customName.trim() || undefined)
		setCustomUrl('')
		setCustomName('')
		setShowCustomInput(false)
		toast.success('已添加自定义音乐')
	}

	// 迷你入口按钮：未开始播放时显示
	if (showMiniButton) {
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.8, y: 20 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				className='fixed right-6 bottom-24 z-50 max-sm:right-4 max-sm:bottom-20'
			>
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
					onClick={() => play()}
					className='card relative flex h-12 w-12 items-center justify-center rounded-full shadow-lg backdrop-blur-md'
					style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)' }}
				>
					<SnowDecoration preset="cardSmall" />
					<Music className='text-brand h-5 w-5' />
				</motion.button>
			</motion.div>
		)
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0, scale: 0.8, y: 20 }}
				animate={{ opacity: 1, scale: 1, y: 0 }}
				exit={{ opacity: 0, scale: 0.8, y: 20 }}
				className='fixed right-6 bottom-24 z-50 max-sm:right-4 max-sm:bottom-20'
			>
				<motion.div
					layout
					className={cn(
						'card relative overflow-visible backdrop-blur-md',
						isExpanded ? 'w-72 p-4' : 'w-auto p-3'
					)}
					style={{
						boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
						borderRadius: isExpanded ? 24 : 20
					}}
				>
					<SnowDecoration preset="capsule" />
					{/* 收起状态：胶囊形态 */}
					{!isExpanded ? (
						<div className='flex items-center gap-3'>
							{/* 音乐图标/专辑封面 */}
							<motion.div
								className={cn(
									'flex h-10 w-10 items-center justify-center rounded-full bg-white',
									isPlaying && 'animate-pulse'
								)}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
							>
								<Music className='text-brand h-5 w-5' />
							</motion.div>

							{/* 曲目名称 */}
							<div className='max-w-24 truncate text-sm font-medium'>
								{currentTrack?.name || '未选择'}
							</div>

							{/* 播放/暂停按钮 */}
							<motion.button
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.9 }}
								onClick={toggle}
								className='bg-brand flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md'
							>
								{isPlaying ? (
									<Pause className='h-4 w-4' />
								) : (
									<Play className='ml-0.5 h-4 w-4' />
								)}
							</motion.button>

							{/* 展开按钮 */}
							<motion.button
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.9 }}
								onClick={() => setIsExpanded(true)}
								className='text-secondary hover:text-brand transition-colors'
							>
								<ChevronUp className='h-5 w-5' />
							</motion.button>
						</div>
					) : (
						/* 展开状态：完整播放器 */
						<div className='space-y-4'>
							{/* 头部：曲目信息 + 收起按钮 */}
							<div className='flex items-center justify-between'>
								<div className='flex items-center gap-3'>
									<div className={cn(
										'flex h-10 w-10 items-center justify-center rounded-full bg-white',
										isPlaying && 'animate-pulse'
									)}>
										<Music className='text-brand h-5 w-5' />
									</div>
									<div>
										<div className='max-w-36 truncate text-sm font-medium'>
											{currentTrack?.name || '未选择'}
										</div>
										<div className='text-secondary text-xs'>
											{playlist.length} 首歌曲
										</div>
									</div>
								</div>
								<motion.button
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
									onClick={() => setIsExpanded(false)}
									className='text-secondary hover:text-brand transition-colors'
								>
									<ChevronDown className='h-5 w-5' />
								</motion.button>
							</div>

							{/* 进度条 */}
							<div className='space-y-1'>
								<div
									className='h-1.5 cursor-pointer rounded-full bg-white/60'
									onClick={handleProgressClick}
								>
									<motion.div
										className='bg-brand h-full rounded-full'
										style={{ width: `${progressPercent}%` }}
									/>
								</div>
								<div className='text-secondary flex justify-between text-xs'>
									<span>{formatTime(progress)}</span>
									<span>{formatTime(duration)}</span>
								</div>
							</div>

							{/* 播放控制 */}
							<div className='flex items-center justify-center gap-4'>
								<motion.button
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
									onClick={prevTrack}
									className='text-secondary hover:text-brand transition-colors'
								>
									<SkipBack className='h-5 w-5' />
								</motion.button>

								<motion.button
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
									onClick={toggle}
									className='bg-brand flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg'
								>
									{isPlaying ? (
										<Pause className='h-5 w-5' />
									) : (
										<Play className='ml-1 h-5 w-5' />
									)}
								</motion.button>

								<motion.button
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
									onClick={nextTrack}
									className='text-secondary hover:text-brand transition-colors'
								>
									<SkipForward className='h-5 w-5' />
								</motion.button>
							</div>

							{/* 音量控制 */}
							<div className='flex items-center gap-2'>
								<motion.button
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
									onClick={toggleMute}
									className='text-secondary hover:text-brand transition-colors'
								>
									{isMuted || volume === 0 ? (
										<VolumeX className='h-4 w-4' />
									) : (
										<Volume2 className='h-4 w-4' />
									)}
								</motion.button>
								<input
									type='range'
									min='0'
									max='1'
									step='0.01'
									value={volume}
									onChange={handleVolumeChange}
									className='range-track flex-1'
								/>
							</div>

							{/* 添加自定义音乐 */}
							<div className='border-t pt-3'>
								{!showCustomInput ? (
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={() => setShowCustomInput(true)}
										className='text-secondary hover:text-brand flex w-full items-center justify-center gap-2 rounded-lg bg-white/40 py-2 text-xs transition-colors hover:bg-white/60'
									>
										<Plus className='h-4 w-4' />
										添加自定义音乐
									</motion.button>
								) : (
									<div className='space-y-2'>
										<input
											type='text'
											placeholder='音乐名称（可选）'
											value={customName}
											onChange={e => setCustomName(e.target.value)}
											className='w-full rounded-lg border bg-white/60 px-3 py-2 text-xs outline-none transition-colors focus:bg-white/80'
										/>
										<input
											type='text'
											placeholder='音频链接 (https://...)'
											value={customUrl}
											onChange={e => setCustomUrl(e.target.value)}
											className='w-full rounded-lg border bg-white/60 px-3 py-2 text-xs outline-none transition-colors focus:bg-white/80'
										/>
										<div className='flex gap-2'>
											<motion.button
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
												onClick={() => {
													setShowCustomInput(false)
													setCustomUrl('')
													setCustomName('')
												}}
												className='text-secondary flex-1 rounded-lg bg-white/40 py-2 text-xs transition-colors hover:bg-white/60'
											>
												取消
											</motion.button>
											<motion.button
												whileHover={{ scale: 1.02 }}
												whileTap={{ scale: 0.98 }}
												onClick={handleAddCustomTrack}
												className='bg-brand flex-1 rounded-lg py-2 text-xs text-white'
											>
												添加
											</motion.button>
										</div>
									</div>
								)}
							</div>
						</div>
					)}
				</motion.div>
			</motion.div>
		</AnimatePresence>
	)
}
