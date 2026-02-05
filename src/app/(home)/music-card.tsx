'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Card from '@/components/card'
import { useCenterStore } from '@/hooks/use-center'
import { useConfigStore } from './stores/config-store'
import { CARD_SPACING } from '@/consts'
import MusicSVG from '@/svgs/music.svg'
import PlaySVG from '@/svgs/play.svg'
import { HomeDraggableLayer } from './home-draggable-layer'
import { Pause, SkipBack, SkipForward } from 'lucide-react'
import { useMusicPlayerStore } from '@/stores/music-player-store'
import { MusicModal } from '@/components/music-modal'
import { loadPlaylistFromRepo } from '@/services/music-service'
import { motion } from 'motion/react'
import { SnowDecoration } from '@/components/snow-decoration'

export default function MusicCard() {
	const center = useCenterStore()
	const { cardStyles, siteContent } = useConfigStore()
	const styles = cardStyles.musicCard
	const hiCardStyles = cardStyles.hiCard
	const clockCardStyles = cardStyles.clockCard
	const calendarCardStyles = cardStyles.calendarCard

	const {
		isPlaying,
		toggle,
		progress,
		duration,
		currentTrack,
		play,
		nextTrack,
		prevTrack,
		setPlaylist,
		isPlaylistLoaded,
		seekTo
	} = useMusicPlayerStore()

	const [modalOpen, setModalOpen] = useState(false)
	const [isDragging, setIsDragging] = useState(false)
	const [dragProgress, setDragProgress] = useState(0)
	const progressBarRef = useRef<HTMLDivElement>(null)

	const x = styles.offsetX !== null ? center.x + styles.offsetX : center.x + CARD_SPACING + hiCardStyles.width / 2 - styles.offset
	const y = styles.offsetY !== null ? center.y + styles.offsetY : center.y - clockCardStyles.offset + CARD_SPACING + calendarCardStyles.height + CARD_SPACING

	// 从仓库加载播放列表
	useEffect(() => {
		if (!isPlaylistLoaded) {
			loadPlaylistFromRepo().then(tracks => {
				if (tracks.length > 0) {
					setPlaylist(tracks)
				}
			})
		}
	}, [isPlaylistLoaded, setPlaylist])

	// 计算进度百分比
	const progressPercent = duration > 0 ? (progress / duration) * 100 : 0
	const displayPercent = isDragging ? dragProgress : progressPercent

	// 进度条拖拽逻辑
	const calculateProgress = useCallback((clientX: number) => {
		if (!progressBarRef.current) return 0
		const rect = progressBarRef.current.getBoundingClientRect()
		const x = clientX - rect.left
		const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
		return percent
	}, [])

	const handleProgressMouseDown = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (duration <= 0) return
		
		setIsDragging(true)
		const percent = calculateProgress(e.clientX)
		setDragProgress(percent)
	}

	const handleProgressTouchStart = (e: React.TouchEvent) => {
		e.stopPropagation()
		if (duration <= 0) return
		
		setIsDragging(true)
		const touch = e.touches[0]
		const percent = calculateProgress(touch.clientX)
		setDragProgress(percent)
	}

	useEffect(() => {
		if (!isDragging) return

		const handleMouseMove = (e: MouseEvent) => {
			const percent = calculateProgress(e.clientX)
			setDragProgress(percent)
		}

		const handleTouchMove = (e: TouchEvent) => {
			const touch = e.touches[0]
			const percent = calculateProgress(touch.clientX)
			setDragProgress(percent)
		}

		const handleEnd = () => {
			setIsDragging(false)
			const newTime = (dragProgress / 100) * duration
			seekTo(newTime)
		}

		window.addEventListener('mousemove', handleMouseMove)
		window.addEventListener('mouseup', handleEnd)
		window.addEventListener('touchmove', handleTouchMove)
		window.addEventListener('touchend', handleEnd)

		return () => {
			window.removeEventListener('mousemove', handleMouseMove)
			window.removeEventListener('mouseup', handleEnd)
			window.removeEventListener('touchmove', handleTouchMove)
			window.removeEventListener('touchend', handleEnd)
		}
	}, [isDragging, dragProgress, duration, seekTo, calculateProgress])

	const togglePlayPause = (e: React.MouseEvent) => {
		e.stopPropagation()
		if (!currentTrack) {
			play()
		} else {
			toggle()
		}
	}

	const handlePrev = (e: React.MouseEvent) => {
		e.stopPropagation()
		prevTrack()
	}

	const handleNext = (e: React.MouseEvent) => {
		e.stopPropagation()
		nextTrack()
	}

	// 点击"点击管理音乐"文字时打开管理面板
	const handleManageClick = (e: React.MouseEvent) => {
		e.stopPropagation()
		setModalOpen(true)
	}

	const handleCardClick = () => {
		setModalOpen(true)
	}

	return (
		<>
			<HomeDraggableLayer cardKey='musicCard' x={x} y={y} width={styles.width} height={styles.height}>
				<Card order={styles.order} width={styles.width} height={styles.height} x={x} y={y} className='flex cursor-pointer items-center gap-2' onClick={handleCardClick}>
					<SnowDecoration preset="musicCard" />

					<MusicSVG className='h-7 w-7 shrink-0' />

					<div className='min-w-0 flex-1'>
						{currentTrack ? (
							<div className='text-secondary truncate text-sm'>{currentTrack.name}</div>
						) : (
							<div 
								className='text-secondary hover:text-brand truncate text-sm cursor-pointer transition-colors'
								onClick={handleManageClick}
							>
								点击管理音乐
							</div>
						)}

						{/* 可拖拽进度条 */}
						<div 
							ref={progressBarRef}
							className='group relative mt-1 h-2 cursor-pointer rounded-full bg-white/60'
							onClick={(e) => {
								e.stopPropagation()
								if (duration <= 0) return
								const percent = calculateProgress(e.clientX)
								const newTime = (percent / 100) * duration
								seekTo(newTime)
							}}
							onMouseDown={handleProgressMouseDown}
							onTouchStart={handleProgressTouchStart}
						>
							<div 
								className='bg-linear h-full rounded-full transition-all duration-100' 
								style={{ width: `${displayPercent}%` }} 
							/>
							{/* 拖拽手柄 - hover/拖拽时显示 */}
							<div 
								className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white shadow-md transition-opacity ${
									isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
								}`}
								style={{ left: `calc(${displayPercent}% - 7px)` }}
							/>
						</div>
					</div>

					{/* 控制按钮组 */}
					<div className='flex items-center gap-1'>
						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={handlePrev}
							className='flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/60 hover:text-gray-600'
						>
							<SkipBack className='h-3.5 w-3.5' />
						</motion.button>

						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={togglePlayPause}
							className='flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition-opacity hover:opacity-80'
						>
							{isPlaying ? <Pause className='text-brand h-4 w-4' /> : <PlaySVG className='text-brand ml-0.5 h-4 w-4' />}
						</motion.button>

						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={handleNext}
							className='flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-white/60 hover:text-gray-600'
						>
							<SkipForward className='h-3.5 w-3.5' />
						</motion.button>
					</div>
				</Card>
			</HomeDraggableLayer>

			<MusicModal open={modalOpen} onClose={() => setModalOpen(false)} />
		</>
	)
}
