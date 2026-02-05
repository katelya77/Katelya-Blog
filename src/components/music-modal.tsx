'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'motion/react'
import { DialogModal } from '@/components/dialog-modal'
import { useMusicPlayerStore, type MusicTrack } from '@/stores/music-player-store'
import { savePlaylist } from '@/services/music-service'
import { useAuthStore } from '@/hooks/use-auth'
import { readFileAsText } from '@/lib/file-utils'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
	Play,
	Pause,
	SkipBack,
	SkipForward,
	Plus,
	Trash2,
	GripVertical,
	Volume2,
	VolumeX,
	Music,
	Save,
	X,
	Edit2,
	Check
} from 'lucide-react'

interface MusicModalProps {
	open: boolean
	onClose: () => void
}

export function MusicModal({ open, onClose }: MusicModalProps) {
	const {
		isPlaying,
		currentTrack,
		progress,
		duration,
		volume,
		playlist,
		hasUnsavedChanges,
		toggle,
		nextTrack,
		prevTrack,
		setVolume,
		seekTo,
		addTrack,
		removeTrack,
		updateTrack,
		reorderTracks,
		setCurrentIndex,
		markAsSaved
	} = useMusicPlayerStore()

	const { isAuth, setPrivateKey } = useAuthStore()
	const keyInputRef = useRef<HTMLInputElement>(null)

	const [newTrackUrl, setNewTrackUrl] = useState('')
	const [newTrackName, setNewTrackName] = useState('')
	const [showAddForm, setShowAddForm] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editingName, setEditingName] = useState('')
	const [isSaving, setIsSaving] = useState(false)
	const [isMuted, setIsMuted] = useState(false)
	const previousVolume = useRef(volume)

	const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

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
		if (newVolume > 0) setIsMuted(false)
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

	const handleAddTrack = () => {
		if (!newTrackUrl.trim()) {
			toast.error('请输入音频链接')
			return
		}

		try {
			new URL(newTrackUrl)
		} catch {
			toast.error('请输入有效的链接')
			return
		}

		addTrack(newTrackUrl.trim(), newTrackName.trim() || undefined)
		setNewTrackUrl('')
		setNewTrackName('')
		setShowAddForm(false)
		toast.success('已添加音乐')
	}

	const handleStartEdit = (track: MusicTrack) => {
		setEditingId(track.id)
		setEditingName(track.name)
	}

	const handleSaveEdit = () => {
		if (editingId && editingName.trim()) {
			updateTrack(editingId, { name: editingName.trim() })
		}
		setEditingId(null)
		setEditingName('')
	}

	const handlePlayTrack = (index: number) => {
		setCurrentIndex(index)
		if (!isPlaying) {
			useMusicPlayerStore.getState().play()
		}
	}

	const handlePrivateKeySelection = useCallback(
		async (file: File) => {
			try {
				const pem = await readFileAsText(file)
				setPrivateKey(pem)
				toast.success('密钥导入成功，请再次点击保存')
			} catch (error) {
				console.error(error)
				toast.error('读取密钥失败')
			}
		},
		[setPrivateKey]
	)

	const handleSave = async () => {
		if (!isAuth) {
			keyInputRef.current?.click()
			return
		}

		try {
			setIsSaving(true)
			await savePlaylist(playlist)
			markAsSaved()
		} catch (error: any) {
			console.error(error)
			toast.error(error?.message || '保存失败')
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<DialogModal open={open} onClose={onClose} className='w-full max-w-lg' snowPreset='modal'>
			<input
				ref={keyInputRef}
				type='file'
				accept='.pem'
				className='hidden'
				onChange={async e => {
					const f = e.target.files?.[0]
					if (f) await handlePrivateKeySelection(f)
					if (e.currentTarget) e.currentTarget.value = ''
				}}
			/>

			<div className='card relative w-full overflow-hidden p-6' style={{ borderRadius: 32 }}>
				{/* 头部 */}
				<div className='mb-6 flex items-center justify-between'>
					<div className='flex items-center gap-3'>
						<div className='bg-brand/10 flex h-10 w-10 items-center justify-center rounded-full'>
							<Music className='text-brand h-5 w-5' />
						</div>
						<div>
							<h2 className='text-lg font-semibold'>音乐播放器</h2>
							<p className='text-secondary text-xs'>{playlist.length} 首歌曲</p>
						</div>
					</div>
					<motion.button
						whileHover={{ scale: 1.1 }}
						whileTap={{ scale: 0.9 }}
						onClick={onClose}
						className='text-secondary hover:text-primary transition-colors'
					>
						<X className='h-5 w-5' />
					</motion.button>
				</div>

				{/* 当前播放 */}
				<div className='mb-6 rounded-2xl bg-white/40 p-4'>
					<div className='mb-3 flex items-center gap-3'>
						<div className={cn(
							'flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm',
							isPlaying && 'animate-pulse'
						)}>
							<Music className='text-brand h-6 w-6' />
						</div>
						<div className='flex-1'>
							<div className='font-medium'>{currentTrack?.name || '未选择'}</div>
							<div className='text-secondary text-xs'>{formatTime(progress)} / {formatTime(duration)}</div>
						</div>
					</div>

					{/* 进度条 */}
					<div
						className='mb-4 h-1.5 cursor-pointer rounded-full bg-white/60'
						onClick={handleProgressClick}
					>
						<div
							className='bg-brand h-full rounded-full transition-all'
							style={{ width: `${progressPercent}%` }}
						/>
					</div>

					{/* 控制按钮 */}
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<motion.button
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.9 }}
								onClick={toggleMute}
								className='text-secondary hover:text-brand transition-colors'
							>
								{isMuted || volume === 0 ? <VolumeX className='h-4 w-4' /> : <Volume2 className='h-4 w-4' />}
							</motion.button>
							<input
								type='range'
								min='0'
								max='1'
								step='0.01'
								value={volume}
								onChange={handleVolumeChange}
								className='range-track w-20'
							/>
						</div>

						<div className='flex items-center gap-3'>
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
								className='bg-brand flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md'
							>
								{isPlaying ? <Pause className='h-4 w-4' /> : <Play className='ml-0.5 h-4 w-4' />}
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

						<div className='w-24' />
					</div>
				</div>

				{/* 播放列表 */}
				<div className='mb-4'>
					<div className='mb-3 flex items-center justify-between'>
						<h3 className='text-sm font-medium'>播放列表</h3>
						<motion.button
							whileHover={{ scale: 1.05 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => setShowAddForm(!showAddForm)}
							className='text-brand flex items-center gap-1 text-xs'
						>
							<Plus className='h-4 w-4' />
							添加
						</motion.button>
					</div>

					{/* 添加表单 */}
					<AnimatePresence>
						{showAddForm && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								exit={{ opacity: 0, height: 0 }}
								className='mb-3 space-y-2 overflow-hidden'
							>
								<input
									type='text'
									placeholder='音乐名称（可选）'
									value={newTrackName}
									onChange={e => setNewTrackName(e.target.value)}
									className='w-full rounded-xl border bg-white/60 px-4 py-2 text-sm outline-none transition-colors focus:bg-white/80'
								/>
								<input
									type='text'
									placeholder='音频链接 (https://...)'
									value={newTrackUrl}
									onChange={e => setNewTrackUrl(e.target.value)}
									className='w-full rounded-xl border bg-white/60 px-4 py-2 text-sm outline-none transition-colors focus:bg-white/80'
								/>
								<div className='flex gap-2'>
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={() => {
											setShowAddForm(false)
											setNewTrackUrl('')
											setNewTrackName('')
										}}
										className='text-secondary flex-1 rounded-xl bg-white/40 py-2 text-sm transition-colors hover:bg-white/60'
									>
										取消
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.02 }}
										whileTap={{ scale: 0.98 }}
										onClick={handleAddTrack}
										className='bg-brand flex-1 rounded-xl py-2 text-sm text-white'
									>
										添加
									</motion.button>
								</div>
							</motion.div>
						)}
					</AnimatePresence>

					{/* 歌曲列表 */}
					<Reorder.Group
						axis='y'
						values={playlist}
						onReorder={reorderTracks}
						className='scrollbar-none max-h-60 space-y-2 overflow-y-auto'
					>
						{playlist.map((track, index) => (
							<Reorder.Item
								key={track.id}
								value={track}
								className={cn(
									'flex items-center gap-2 rounded-xl border bg-white/40 p-3 transition-colors',
									currentTrack?.id === track.id && 'border-brand/40 bg-brand/5'
								)}
							>
								<GripVertical className='text-secondary h-4 w-4 cursor-grab' />

								<motion.button
									whileHover={{ scale: 1.1 }}
									whileTap={{ scale: 0.9 }}
									onClick={() => handlePlayTrack(index)}
									className={cn(
										'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
										currentTrack?.id === track.id
											? 'bg-brand text-white'
											: 'bg-white/60 text-secondary hover:text-brand'
									)}
								>
									{currentTrack?.id === track.id && isPlaying ? (
										<Pause className='h-3 w-3' />
									) : (
										<Play className='ml-0.5 h-3 w-3' />
									)}
								</motion.button>

								<div className='min-w-0 flex-1'>
									{editingId === track.id ? (
										<input
											type='text'
											value={editingName}
											onChange={e => setEditingName(e.target.value)}
											onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
											className='w-full rounded border bg-white px-2 py-1 text-sm outline-none'
											autoFocus
										/>
									) : (
										<div className='truncate text-sm font-medium'>{track.name}</div>
									)}
									{track.isCustom && <div className='text-secondary truncate text-xs'>{track.url}</div>}
								</div>

								<div className='flex items-center gap-1'>
									{editingId === track.id ? (
										<motion.button
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.9 }}
											onClick={handleSaveEdit}
											className='text-brand p-1'
										>
											<Check className='h-4 w-4' />
										</motion.button>
									) : (
										<motion.button
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.9 }}
											onClick={() => handleStartEdit(track)}
											className='text-secondary hover:text-brand p-1 transition-colors'
										>
											<Edit2 className='h-3.5 w-3.5' />
										</motion.button>
									)}
									<motion.button
										whileHover={{ scale: 1.1 }}
										whileTap={{ scale: 0.9 }}
										onClick={() => removeTrack(track.id)}
										className='p-1 text-red-400 transition-colors hover:text-red-600'
									>
										<Trash2 className='h-3.5 w-3.5' />
									</motion.button>
								</div>
							</Reorder.Item>
						))}
					</Reorder.Group>
				</div>

				{/* 保存按钮 */}
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={handleSave}
					disabled={isSaving}
					className={cn(
						'brand-btn w-full justify-center',
						hasUnsavedChanges && 'ring-brand/30 ring-2'
					)}
				>
					<Save className='h-4 w-4' />
					{isSaving ? '保存中...' : isAuth ? '保存到仓库' : '导入密钥并保存'}
					{hasUnsavedChanges && <span className='ml-2 text-xs opacity-80'>（有未保存的更改）</span>}
				</motion.button>
			</div>
		</DialogModal>
	)
}
