'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Reorder } from 'motion/react'
import { toast } from 'sonner'
import { useMusicPlayerStore, MusicTrack } from '@/stores/music-player-store'
import { useVideoPlayerStore, VideoItem } from '@/stores/video-player-store'
import { loadPlaylistFromRepo } from '@/services/music-service'
import { loadVideoPlaylistFromRepo } from '@/services/video-service'
import { saveAllMedia } from '@/services/media-service'
import { useAuthStore } from '@/hooks/use-auth'
import { readFileAsText } from '@/lib/file-utils'
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
	Check,
	Video,
	Link,
	Maximize,
	Minimize,
	Loader2,
	Key,
	FileText,
	Upload,
	RefreshCw
} from 'lucide-react'

import { SnowDecoration } from '@/components/snow-decoration'

export default function MediaPage() {
	const { isAuth, setPrivateKey } = useAuthStore()
	const musicStore = useMusicPlayerStore()
	const videoStore = useVideoPlayerStore()
	const [isSaving, setIsSaving] = useState(false)
	const [showBatchModal, setShowBatchModal] = useState<'audio' | 'video' | null>(null)
	const keyInputRef = useRef<HTMLInputElement>(null)

	// 加载数据
	useEffect(() => {
		if (!musicStore.isPlaylistLoaded) {
			loadPlaylistFromRepo()
				.then(tracks => {
					if (tracks.length > 0) musicStore.setPlaylist(tracks)
				})
				.catch(console.error)
		}
		if (!videoStore.isPlaylistLoaded) {
			loadVideoPlaylistFromRepo()
				.then(videos => {
					if (videos.length > 0) videoStore.setPlaylist(videos)
				})
				.catch(console.error)
		}
	}, [musicStore.isPlaylistLoaded, videoStore.isPlaylistLoaded])

	const hasUnsavedChanges = musicStore.hasUnsavedChanges || videoStore.hasUnsavedChanges

	// 智能鉴权保存
	const handleSaveClick = () => {
		if (!isAuth) {
			keyInputRef.current?.click()
		} else {
			handleSave()
		}
	}

	const handleSave = async () => {
		setIsSaving(true)
		try {
			await saveAllMedia(musicStore.playlist, videoStore.playlist)
			musicStore.markAsSaved()
			videoStore.markAsSaved()
		} catch (err) {
			toast.error('保存失败: ' + (err instanceof Error ? err.message : '未知错误'))
		} finally {
			setIsSaving(false)
		}
	}

	const handlePrivateKeySelection = async (file: File) => {
		try {
			const pem = await readFileAsText(file)
			setPrivateKey(pem)
			toast.success('密钥导入成功')
			await handleSave()
		} catch (error) {
			console.error(error)
			toast.error('读取密钥失败')
		}
	}

	return (
		<main className='min-h-screen w-full px-6 py-24 max-lg:py-20 max-sm:px-4'>
			{/* 隐藏的密钥输入 */}
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

			{/* 右上角固定操作区 - 参考 About 页面样式 */}
			<motion.div
				initial={{ opacity: 0, scale: 0.6 }}
				animate={{ opacity: 1, scale: 1 }}
				className='fixed top-4 right-6 z-10 flex gap-3 max-sm:hidden'>
				{hasUnsavedChanges && (
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={handleSaveClick}
						disabled={isSaving}
						className={cn(
							'brand-btn gap-2 px-6',
							hasUnsavedChanges && 'ring-brand/30 ring-2'
						)}>
						{isAuth ? <Save className='h-4 w-4' /> : <Key className='h-4 w-4' />}
						{isSaving ? '保存中...' : isAuth ? '保存全部' : '导入密钥'}
					</motion.button>
				)}
			</motion.div>

			<div className='mx-auto max-w-7xl'>
				{/* 标题区 */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className='mb-10 flex items-center justify-between'>
					<div>
						<h1 className='text-3xl font-bold'>影音空间</h1>
						<p className='text-secondary mt-1 text-sm'>
							视频播放与音乐管理
							{hasUnsavedChanges && <span className='text-brand ml-2'>• 有未保存更改</span>}
						</p>
					</div>

					{/* 移动端保存按钮 */}
					{hasUnsavedChanges && (
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={handleSaveClick}
							disabled={isSaving}
							className='brand-btn gap-2 sm:hidden'>
							{isAuth ? <Save className='h-4 w-4' /> : <Key className='h-4 w-4' />}
							{isSaving ? '...' : isAuth ? '保存' : '密钥'}
						</motion.button>
					)}
				</motion.div>

				{/* 双卡片布局 - 移动端堆叠 */}
				<div className='grid grid-cols-2 gap-6 max-lg:grid-cols-1'>
					<VideoCard onBatchAdd={() => setShowBatchModal('video')} />
					<AudioCard onBatchAdd={() => setShowBatchModal('audio')} />
				</div>
			</div>

			{/* 批量导入弹窗 */}
			<BatchImportModal
				type={showBatchModal}
				onClose={() => setShowBatchModal(null)}
			/>
		</main>
	)
}

// ========================
// 批量导入弹窗
// ========================
function BatchImportModal({ type, onClose }: { type: 'audio' | 'video' | null; onClose: () => void }) {
	const [text, setText] = useState('')
	const musicStore = useMusicPlayerStore()
	const videoStore = useVideoPlayerStore()

	if (!type) return null

	const handleImport = () => {
		const lines = text.split('\n').filter(line => line.trim())
		const items: { url: string; name?: string }[] = []

		// Regex for Markdown image: ![Name](URL)
		const mdRegex = /!\[(.*?)\]\((.*?)\)/

		for (const line of lines) {
			const trimmed = line.trim()
			const match = trimmed.match(mdRegex)
			
			if (match) {
				const name = match[1].trim()
				const url = match[2].trim()
				if (url) {
					items.push({ url, name: name || undefined })
				}
			} else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
				// Fallback for pure URL
				items.push({ url: trimmed })
			}
		}

		if (items.length === 0) {
			toast.error('未识别到有效链接，请使用 ![名称](链接) 格式')
			return
		}

		if (type === 'audio') {
			items.forEach(item => musicStore.addTrack(item.url, item.name))
		} else {
			videoStore.addVideos(items)
		}

		toast.success(`已添加 ${items.length} 个${type === 'audio' ? '音频' : '视频'}`)
		setText('')
		onClose()
	}

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm'
				onClick={onClose}>
				<motion.div
					initial={{ scale: 0.9, opacity: 0 }}
					animate={{ scale: 1, opacity: 1 }}
					exit={{ scale: 0.9, opacity: 0 }}
					onClick={e => e.stopPropagation()}
					className='card mx-4 w-full max-w-lg p-6'
					style={{ position: 'relative', borderRadius: 32 }}>
					<div className='mb-4 flex items-center justify-between'>
						<div className='flex items-center gap-3'>
							<div className='bg-brand/10 flex h-10 w-10 items-center justify-center rounded-full'>
								<Upload className='text-brand h-5 w-5' />
							</div>
							<div>
								<h3 className='font-semibold'>批量添加{type === 'audio' ? '音频' : '视频'}</h3>
								<p className='text-secondary text-xs'>每行一个链接，支持 Markdown 格式 ![名称](URL)</p>
							</div>
						</div>
						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.9 }}
							onClick={onClose}
							className='text-secondary hover:text-primary'>
							<X className='h-5 w-5' />
						</motion.button>
					</div>

					<textarea
						value={text}
						onChange={e => setText(e.target.value)}
						placeholder={`示例：\n![我的歌曲](https://example.com/song.mp3)\nhttps://example.com/another.mp3`}
						className='mb-4 h-48 w-full resize-none rounded-xl border bg-white/50 p-4 text-sm outline-none focus:ring-2 focus:ring-blue-200'
					/>

					<div className='flex justify-end gap-3'>
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={onClose}
							className='rounded-xl border px-4 py-2 text-sm transition-colors hover:bg-white/50'>
							取消
						</motion.button>
						<motion.button
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							onClick={handleImport}
							className='brand-btn'>
							<FileText className='h-4 w-4' />
							导入
						</motion.button>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	)
}

// ========================
// 视频管理卡片
// ========================
function VideoCard({ onBatchAdd }: { onBatchAdd: () => void }) {
	const {
		playlist,
		currentVideo,
		currentIndex,
		setCurrentVideo,
		addVideo,
		removeVideo,
		updateVideo,
		reorderVideos,
		playVideo,
		playNext,
		playPrev
	} = useVideoPlayerStore()

	const [inputUrl, setInputUrl] = useState('')
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [volume, setVolume] = useState(1)
	const [isMuted, setIsMuted] = useState(false)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [showControls, setShowControls] = useState(true)
	const [isLoading, setIsLoading] = useState(false)
	const [videoError, setVideoError] = useState<string | null>(null)
	const [showAddForm, setShowAddForm] = useState(false)
	const [newVideoName, setNewVideoName] = useState('')
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editingName, setEditingName] = useState('')

	const videoRef = useRef<HTMLVideoElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)
	const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
	const previousVolume = useRef(1)
	const hlsRef = useRef<any>(null)

	// 示例视频
	const exampleVideos = [
		{ name: 'Big Buck Bunny', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' },
		{ name: 'Sintel', url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8' }
	]

	// 加载视频
	const loadVideo = useCallback((url: string) => {
		if (!url.trim() || !videoRef.current) return

		setVideoError(null)
		setIsLoading(true)

		// 清理旧的 HLS 实例
		if (hlsRef.current) {
			hlsRef.current.destroy()
			hlsRef.current = null
		}

		const isHLS = url.includes('.m3u8')

		if (isHLS) {
			import('hls.js').then(({ default: Hls }) => {
				if (Hls.isSupported() && videoRef.current) {
					const hls = new Hls()
					hlsRef.current = hls
					hls.loadSource(url)
					hls.attachMedia(videoRef.current)
					hls.on(Hls.Events.MANIFEST_PARSED, () => {
						setIsLoading(false)
						videoRef.current?.play()
						setIsPlaying(true)
					})
					hls.on(Hls.Events.ERROR, (_event: unknown, data: { fatal?: boolean }) => {
						if (data.fatal) {
							setIsLoading(false)
							setVideoError('视频加载失败')
						}
					})
				} else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
					videoRef.current.src = url
					videoRef.current.play()
					setIsPlaying(true)
					setIsLoading(false)
				} else {
					setIsLoading(false)
					setVideoError('浏览器不支持 HLS')
				}
			}).catch(() => {
				setIsLoading(false)
				setVideoError('HLS 库加载失败')
			})
		} else {
			// 非 HLS 视频：设置 src 并自动播放
			videoRef.current.src = url
			videoRef.current.load()
			videoRef.current.play().then(() => {
				setIsPlaying(true)
				setIsLoading(false)
			}).catch(() => {
				// 浏览器可能阻止自动播放，用户需手动点击
				setIsLoading(false)
			})
		}
	}, [])

	// 当前视频变化时加载
	useEffect(() => {
		if (currentVideo) {
			loadVideo(currentVideo.url)
		}
	}, [currentVideo, loadVideo])

	const togglePlayPause = () => {
		if (!videoRef.current) return
		if (isPlaying) {
			videoRef.current.pause()
		} else {
			videoRef.current.play()
		}
		setIsPlaying(!isPlaying)
	}

	const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
		if (!videoRef.current || !duration) return
		const rect = e.currentTarget.getBoundingClientRect()
		const x = e.clientX - rect.left
		const percent = x / rect.width
		videoRef.current.currentTime = percent * duration
		setCurrentTime(percent * duration)
	}

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const vol = parseFloat(e.target.value)
		setVolume(vol)
		setIsMuted(vol === 0)
		if (videoRef.current) videoRef.current.volume = vol
	}

	const toggleMute = () => {
		if (isMuted) {
			setVolume(previousVolume.current || 0.5)
			if (videoRef.current) videoRef.current.volume = previousVolume.current || 0.5
			setIsMuted(false)
		} else {
			previousVolume.current = volume
			setVolume(0)
			if (videoRef.current) videoRef.current.volume = 0
			setIsMuted(true)
		}
	}

	const toggleFullscreen = async () => {
		if (!containerRef.current) return
		if (!document.fullscreenElement) {
			await containerRef.current.requestFullscreen()
			setIsFullscreen(true)
		} else {
			await document.exitFullscreen()
			setIsFullscreen(false)
		}
	}

	const formatTime = (s: number) => {
		if (!s || isNaN(s)) return '0:00'
		const mins = Math.floor(s / 60)
		const secs = Math.floor(s % 60)
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const handleMouseMove = () => {
		setShowControls(true)
		if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
		controlsTimeoutRef.current = setTimeout(() => {
			if (isPlaying) setShowControls(false)
		}, 3000)
	}

	const handleAddVideo = () => {
		if (!inputUrl.trim()) {
			toast.error('请输入视频链接')
			return
		}
		addVideo(inputUrl.trim(), newVideoName.trim() || undefined)
		setInputUrl('')
		setNewVideoName('')
		setShowAddForm(false)
		toast.success('已添加视频')
	}

	const handleStartEdit = (video: VideoItem) => {
		setEditingId(video.id)
		setEditingName(video.name)
	}

	const handleSaveEdit = () => {
		if (editingId && editingName.trim()) {
			updateVideo(editingId, { name: editingName.trim() })
		}
		setEditingId(null)
		setEditingName('')
	}

	const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.1 }}
			className='card relative flex flex-col overflow-visible'
			style={{ position: 'relative', borderRadius: 40 }}>
			<SnowDecoration preset="cardLarge" />
			{/* 头部 */}
			<div className='mb-4 flex items-center justify-between'>
				<div className='flex items-center gap-3'>
					<div className='bg-brand/10 flex h-10 w-10 items-center justify-center rounded-full'>
						<Video className='text-brand h-5 w-5' />
					</div>
					<div>
						<h2 className='font-semibold'>视频管理</h2>
						<p className='text-secondary text-xs'>{playlist.length} 个视频</p>
					</div>
				</div>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={onBatchAdd}
					className='flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors hover:bg-white/50'>
					<Upload className='h-3.5 w-3.5' />
					批量添加
				</motion.button>
			</div>

			{/* 视频播放器 */}
			<div
				ref={containerRef}
				className='relative mb-2 aspect-video overflow-hidden rounded-2xl bg-black/90'
				onMouseMove={handleMouseMove}
				onMouseLeave={() => isPlaying && setShowControls(false)}>
				{videoError ? (
					<div className='flex h-full items-center justify-center p-6'>
						<p className='text-center text-sm text-red-400'>{videoError}</p>
					</div>
				) : !currentVideo ? (
					<div className='flex h-full flex-col items-center justify-center gap-3'>
						<Video className='text-secondary h-12 w-12 opacity-30' />
						<p className='text-secondary text-sm'>选择视频开始播放</p>
					</div>
				) : (
					<>
						{isLoading && (
							<div className='absolute inset-0 z-10 flex items-center justify-center bg-black/50'>
								<Loader2 className='h-8 w-8 animate-spin text-white' />
							</div>
						)}
						<video
							ref={videoRef}
							className='h-full w-full'
							onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
							onLoadedMetadata={() => {
								if (videoRef.current) {
									setDuration(videoRef.current.duration)
									setIsLoading(false)
								}
							}}
							onPlay={() => setIsPlaying(true)}
							onPause={() => setIsPlaying(false)}
							onError={() => {
								setIsLoading(false)
								setVideoError('视频加载失败')
							}}
							onClick={togglePlayPause}
						/>

						{/* 控制栏 */}
						<AnimatePresence>
							{showControls && (
								<motion.div
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									className='absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-4'>
									<div
										className='mb-3 h-1.5 cursor-pointer overflow-hidden rounded-full bg-white/20'
										onClick={handleSeek}>
										<div className='bg-brand h-full transition-all' style={{ width: `${progressPercent}%` }} />
									</div>

									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-3'>
											<button onClick={togglePlayPause} className='text-white transition-transform hover:scale-110'>
												{isPlaying ? <Pause className='h-5 w-5' /> : <Play className='h-5 w-5' />}
											</button>
											<span className='text-xs text-white/80'>
												{formatTime(currentTime)} / {formatTime(duration)}
											</span>
										</div>

										<div className='flex items-center gap-3'>
											<div className='group flex items-center gap-2'>
												<button onClick={toggleMute} className='text-white'>
													{isMuted || volume === 0 ? <VolumeX className='h-4 w-4' /> : <Volume2 className='h-4 w-4' />}
												</button>
												<input
													type='range'
													min={0}
													max={1}
													step={0.05}
													value={volume}
													onChange={handleVolumeChange}
													className='h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/30 opacity-0 transition-opacity group-hover:opacity-100 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white'
												/>
											</div>
											<button onClick={toggleFullscreen} className='text-white transition-transform hover:scale-110'>
												{isFullscreen ? <Minimize className='h-4 w-4' /> : <Maximize className='h-4 w-4' />}
											</button>
										</div>
									</div>
								</motion.div>
							)}
						</AnimatePresence>
					</>
				)}
			</div>

			{/* 外部控制栏 - 上一个/下一个/重载 */}
			<div className='mb-4 flex items-center justify-center gap-3'>
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
					onClick={playPrev}
					disabled={playlist.length === 0}
					className='text-secondary hover:text-primary grid h-9 w-9 place-items-center rounded-full border transition-colors hover:bg-white/50 disabled:opacity-40'>
					<SkipBack className='h-4 w-4' />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.05 }}
					whileTap={{ scale: 0.95 }}
					onClick={togglePlayPause}
					disabled={!currentVideo}
					className='bg-brand grid h-11 w-11 place-items-center rounded-full text-white shadow-lg disabled:opacity-40'>
					{isPlaying ? <Pause className='h-5 w-5' /> : <Play className='ml-0.5 h-5 w-5' />}
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
					onClick={playNext}
					disabled={playlist.length === 0}
					className='text-secondary hover:text-primary grid h-9 w-9 place-items-center rounded-full border transition-colors hover:bg-white/50 disabled:opacity-40'>
					<SkipForward className='h-4 w-4' />
				</motion.button>
				<motion.button
					whileHover={{ scale: 1.1 }}
					whileTap={{ scale: 0.9 }}
					onClick={() => currentVideo && loadVideo(currentVideo.url)}
					disabled={!currentVideo}
					className='text-secondary hover:text-primary grid h-9 w-9 place-items-center rounded-full border transition-colors hover:bg-white/50 disabled:opacity-40'>
					<RefreshCw className='h-4 w-4' />
				</motion.button>
			</div>

			{/* 添加视频区 */}
			<div className='mb-3 flex items-center justify-between'>
				<span className='text-secondary text-sm'>视频列表</span>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => setShowAddForm(!showAddForm)}
					className='flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors hover:bg-white/50'>
					{showAddForm ? <X className='h-3.5 w-3.5' /> : <Plus className='h-3.5 w-3.5' />}
					{showAddForm ? '取消' : '添加'}
				</motion.button>
			</div>

			<AnimatePresence>
				{showAddForm && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className='mb-3 overflow-hidden'>
						<div className='space-y-2 rounded-xl border bg-white/30 p-3'>
							<input
								type='text'
								placeholder='视频名称（可选）'
								value={newVideoName}
								onChange={e => setNewVideoName(e.target.value)}
								className='w-full rounded-lg border bg-white/50 px-3 py-2 text-sm outline-none'
							/>
							<div className='flex gap-2'>
								<div className='relative flex-1'>
									<Link className='text-secondary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
									<input
										type='text'
										placeholder='视频链接 *'
										value={inputUrl}
										onChange={e => setInputUrl(e.target.value)}
										className='w-full rounded-lg border bg-white/50 py-2 pr-3 pl-10 text-sm outline-none'
									/>
								</div>
								<motion.button
									whileHover={{ scale: 1.02 }}
									whileTap={{ scale: 0.98 }}
									onClick={handleAddVideo}
									className='brand-btn shrink-0'>
									添加
								</motion.button>
							</div>
							<div className='flex flex-wrap gap-2'>
								<span className='text-secondary text-xs'>示例：</span>
								{exampleVideos.map(v => (
									<button
										key={v.name}
										onClick={() => {
											addVideo(v.url, v.name)
											toast.success('已添加示例视频')
										}}
										className='text-brand text-xs underline-offset-2 hover:underline'>
										{v.name}
									</button>
								))}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* 视频列表 */}
			<div className='scrollbar-none max-h-48 flex-1 overflow-y-auto'>
				{playlist.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-8'>
						<Video className='text-secondary mb-2 h-8 w-8 opacity-30' />
						<p className='text-secondary text-sm'>暂无视频</p>
					</div>
				) : (
					<Reorder.Group axis='y' values={playlist} onReorder={reorderVideos} className='space-y-1.5'>
						{playlist.map((video, index) => (
							<Reorder.Item key={video.id} value={video}>
								<motion.div
									layout
									className={cn(
										'flex cursor-grab items-center gap-2 rounded-xl p-2 transition-colors active:cursor-grabbing',
										currentVideo?.id === video.id ? 'bg-brand/10 border-brand/30 border' : 'hover:bg-white/50'
									)}>
									<GripVertical className='text-secondary h-4 w-4 shrink-0' />

									<div className='text-secondary grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/50 text-xs'>
										{index + 1}
									</div>

									<div className='min-w-0 flex-1'>
										{editingId === video.id ? (
											<input
												type='text'
												value={editingName}
												onChange={e => setEditingName(e.target.value)}
												onBlur={handleSaveEdit}
												onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
												className='w-full rounded border bg-white px-2 py-1 text-sm outline-none'
												autoFocus
											/>
										) : (
											<p className='truncate text-sm font-medium'>{video.name}</p>
										)}
									</div>

									<div className='flex shrink-0 gap-0.5'>
										<motion.button
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.9 }}
											onClick={() => playVideo(index)}
											className='text-secondary hover:text-primary grid h-7 w-7 place-items-center rounded-md'>
											{currentVideo?.id === video.id ? <Pause className='h-3.5 w-3.5' /> : <Play className='h-3.5 w-3.5' />}
										</motion.button>
										{editingId === video.id ? (
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={handleSaveEdit}
												className='text-brand grid h-7 w-7 place-items-center rounded-md'>
												<Check className='h-3.5 w-3.5' />
											</motion.button>
										) : (
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => handleStartEdit(video)}
												className='text-secondary hover:text-primary grid h-7 w-7 place-items-center rounded-md'>
												<Edit2 className='h-3.5 w-3.5' />
											</motion.button>
										)}
										<motion.button
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.9 }}
											onClick={() => removeVideo(video.id)}
											className='text-secondary grid h-7 w-7 place-items-center rounded-md hover:text-red-500'>
											<Trash2 className='h-3.5 w-3.5' />
										</motion.button>
									</div>
								</motion.div>
							</Reorder.Item>
						))}
					</Reorder.Group>
				)}
			</div>
		</motion.div>
	)
}

// ========================
// 音频管理卡片
// ========================
function AudioCard({ onBatchAdd }: { onBatchAdd: () => void }) {
	const {
		playlist,
		currentTrack,
		isPlaying,
		volume,
		progress,
		duration,
		play,
		toggle,
		setVolume,
		nextTrack,
		prevTrack,
		addTrack,
		removeTrack,
		updateTrack,
		reorderTracks,
		setCurrentIndex,
		seekTo
	} = useMusicPlayerStore()

	const [showAddForm, setShowAddForm] = useState(false)
	const [newTrack, setNewTrack] = useState({ name: '', url: '' })
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editingName, setEditingName] = useState('')
	const [isMuted, setIsMuted] = useState(false)
	const previousVolume = useRef(volume)

	const handleAddTrack = () => {
		if (!newTrack.url.trim()) {
			toast.error('请输入音频链接')
			return
		}
		addTrack(newTrack.url.trim(), newTrack.name.trim() || undefined)
		setNewTrack({ name: '', url: '' })
		setShowAddForm(false)
		toast.success('已添加')
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
		if (!isPlaying) play()
	}

	const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newVol = parseFloat(e.target.value)
		setVolume(newVol)
		if (newVol > 0) setIsMuted(false)
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

	const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const rect = e.currentTarget.getBoundingClientRect()
		const x = e.clientX - rect.left
		const percent = x / rect.width
		seekTo(percent * duration)
	}

	const formatTime = (s: number) => {
		if (!s || isNaN(s)) return '0:00'
		const mins = Math.floor(s / 60)
		const secs = Math.floor(s % 60)
		return `${mins}:${secs.toString().padStart(2, '0')}`
	}

	const progressPercent = duration > 0 ? (progress / duration) * 100 : 0

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.2 }}
			className='card relative flex flex-col overflow-visible'
			style={{ position: 'relative', borderRadius: 40 }}>
			<SnowDecoration preset="cardLarge" />
			{/* 头部 */}
			<div className='mb-4 flex items-center justify-between'>
				<div className='flex items-center gap-3'>
					<div className='bg-brand/10 flex h-10 w-10 items-center justify-center rounded-full'>
						<Music className='text-brand h-5 w-5' />
					</div>
					<div>
						<h2 className='font-semibold'>音乐管理</h2>
						<p className='text-secondary text-xs'>{playlist.length} 首曲目</p>
					</div>
				</div>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={onBatchAdd}
					className='flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors hover:bg-white/50'>
					<Upload className='h-3.5 w-3.5' />
					批量添加
				</motion.button>
			</div>

			{/* 当前播放 */}
			{currentTrack && (
				<div className='mb-4 rounded-2xl border bg-white/30 p-4'>
					<div className='mb-3 flex items-center gap-3'>
						<div className='bg-brand/20 flex h-12 w-12 items-center justify-center rounded-xl'>
							<Music className='text-brand h-6 w-6' />
						</div>
						<div className='flex-1 overflow-hidden'>
							<p className='truncate font-medium'>{currentTrack.name}</p>
							<p className='text-secondary text-xs'>{currentTrack.isCustom ? '自定义曲目' : '默认曲目'}</p>
						</div>
					</div>

					{/* 进度条 */}
					<div className='mb-2'>
						<div
							className='h-1.5 cursor-pointer overflow-hidden rounded-full bg-black/5'
							onClick={handleProgressClick}>
							<div className='bg-brand h-full transition-all' style={{ width: `${progressPercent}%` }} />
						</div>
						<div className='text-secondary mt-1 flex justify-between text-xs'>
							<span>{formatTime(progress)}</span>
							<span>{formatTime(duration)}</span>
						</div>
					</div>

					{/* 控制按钮 */}
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<motion.button
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.9 }}
								onClick={prevTrack}
								className='text-secondary hover:text-primary p-1'>
								<SkipBack className='h-5 w-5' />
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={toggle}
								className='bg-brand flex h-10 w-10 items-center justify-center rounded-full text-white'>
								{isPlaying ? <Pause className='h-5 w-5' /> : <Play className='ml-0.5 h-5 w-5' />}
							</motion.button>
							<motion.button
								whileHover={{ scale: 1.1 }}
								whileTap={{ scale: 0.9 }}
								onClick={nextTrack}
								className='text-secondary hover:text-primary p-1'>
								<SkipForward className='h-5 w-5' />
							</motion.button>
						</div>

						{/* 音量 */}
						<div className='flex items-center gap-2'>
							<button onClick={toggleMute} className='text-secondary hover:text-primary'>
								{isMuted || volume === 0 ? <VolumeX className='h-4 w-4' /> : <Volume2 className='h-4 w-4' />}
							</button>
							<input
								type='range'
								min={0}
								max={1}
								step={0.01}
								value={volume}
								onChange={handleVolumeChange}
								className='range-track h-1.5 w-20'
							/>
						</div>
					</div>
				</div>
			)}

			{/* 添加按钮 */}
			<div className='mb-3 flex items-center justify-between'>
				<span className='text-secondary text-sm'>播放列表</span>
				<motion.button
					whileHover={{ scale: 1.02 }}
					whileTap={{ scale: 0.98 }}
					onClick={() => setShowAddForm(!showAddForm)}
					className='flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs transition-colors hover:bg-white/50'>
					{showAddForm ? <X className='h-3.5 w-3.5' /> : <Plus className='h-3.5 w-3.5' />}
					{showAddForm ? '取消' : '添加'}
				</motion.button>
			</div>

			{/* 添加表单 */}
			<AnimatePresence>
				{showAddForm && (
					<motion.div
						initial={{ opacity: 0, height: 0 }}
						animate={{ opacity: 1, height: 'auto' }}
						exit={{ opacity: 0, height: 0 }}
						className='mb-3 overflow-hidden'>
						<div className='space-y-2 rounded-xl border bg-white/30 p-3'>
							<input
								type='text'
								placeholder='曲目名称（可选）'
								value={newTrack.name}
								onChange={e => setNewTrack({ ...newTrack, name: e.target.value })}
								className='w-full rounded-lg border bg-white/50 px-3 py-2 text-sm outline-none'
							/>
							<input
								type='text'
								placeholder='音频链接 *'
								value={newTrack.url}
								onChange={e => setNewTrack({ ...newTrack, url: e.target.value })}
								className='w-full rounded-lg border bg-white/50 px-3 py-2 text-sm outline-none'
							/>
							<motion.button
								whileHover={{ scale: 1.01 }}
								whileTap={{ scale: 0.99 }}
								onClick={handleAddTrack}
								className='brand-btn w-full justify-center'>
								添加到列表
							</motion.button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* 曲目列表 */}
			<div className='scrollbar-none max-h-80 flex-1 overflow-y-auto'>
				{playlist.length === 0 ? (
					<div className='flex flex-col items-center justify-center py-8'>
						<Music className='text-secondary mb-2 h-8 w-8 opacity-30' />
						<p className='text-secondary text-sm'>暂无曲目</p>
					</div>
				) : (
					<Reorder.Group axis='y' values={playlist} onReorder={reorderTracks} className='space-y-1.5'>
						{playlist.map((track, index) => (
							<Reorder.Item key={track.id} value={track}>
								<motion.div
									layout
									className={cn(
										'flex cursor-grab items-center gap-2 rounded-xl p-2 transition-colors active:cursor-grabbing',
										currentTrack?.id === track.id ? 'bg-brand/10 border-brand/30 border' : 'hover:bg-white/50'
									)}>
									<GripVertical className='text-secondary h-4 w-4 shrink-0' />

									<div className='text-secondary grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/50 text-xs'>
										{index + 1}
									</div>

									<div className='min-w-0 flex-1'>
										{editingId === track.id ? (
											<input
												type='text'
												value={editingName}
												onChange={e => setEditingName(e.target.value)}
												onBlur={handleSaveEdit}
												onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
												className='w-full rounded border bg-white px-2 py-1 text-sm outline-none'
												autoFocus
											/>
										) : (
											<p className='truncate text-sm font-medium'>{track.name}</p>
										)}
									</div>

									{currentTrack?.id === track.id && isPlaying && (
										<div className='text-brand flex items-center gap-0.5'>
											<span className='inline-block h-2 w-0.5 animate-pulse rounded-full bg-current' style={{ animationDelay: '0ms' }} />
											<span className='inline-block h-3 w-0.5 animate-pulse rounded-full bg-current' style={{ animationDelay: '150ms' }} />
											<span className='inline-block h-2 w-0.5 animate-pulse rounded-full bg-current' style={{ animationDelay: '300ms' }} />
										</div>
									)}

									<div className='flex shrink-0 gap-0.5'>
										<motion.button
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.9 }}
											onClick={() => currentTrack?.id === track.id ? toggle() : handlePlayTrack(index)}
											className='text-secondary hover:text-primary grid h-7 w-7 place-items-center rounded-md'>
											{currentTrack?.id === track.id && isPlaying ? (
												<Pause className='h-3.5 w-3.5' />
											) : (
												<Play className='h-3.5 w-3.5' />
											)}
										</motion.button>
										{editingId === track.id ? (
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={handleSaveEdit}
												className='text-brand grid h-7 w-7 place-items-center rounded-md'>
												<Check className='h-3.5 w-3.5' />
											</motion.button>
										) : (
											<motion.button
												whileHover={{ scale: 1.1 }}
												whileTap={{ scale: 0.9 }}
												onClick={() => handleStartEdit(track)}
												className='text-secondary hover:text-primary grid h-7 w-7 place-items-center rounded-md'>
												<Edit2 className='h-3.5 w-3.5' />
											</motion.button>
										)}
										<motion.button
											whileHover={{ scale: 1.1 }}
											whileTap={{ scale: 0.9 }}
											onClick={() => removeTrack(track.id)}
											className='text-secondary grid h-7 w-7 place-items-center rounded-md hover:text-red-500'>
											<Trash2 className='h-3.5 w-3.5' />
										</motion.button>
									</div>
								</motion.div>
							</Reorder.Item>
						))}
					</Reorder.Group>
				)}
			</div>
		</motion.div>
	)
}
