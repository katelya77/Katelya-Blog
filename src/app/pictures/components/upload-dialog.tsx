'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Upload, Link, Trash2, Image as ImageIcon, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { DialogModal } from '@/components/dialog-modal'
import type { ImageItem } from '../../projects/components/image-upload-dialog'

type TabType = 'local' | 'external'

interface UploadDialogProps {
	onClose: () => void
	onSubmit: (payload: { images: ImageItem[]; description: string }) => void
}

interface ExternalImage {
	url: string
	status: 'pending' | 'valid' | 'invalid'
}

export default function UploadDialog({ onClose, onSubmit }: UploadDialogProps) {
	const [activeTab, setActiveTab] = useState<TabType>('local')
	const [description, setDescription] = useState('')
	const [images, setImages] = useState<ImageItem[]>([])
	const [externalImages, setExternalImages] = useState<ExternalImage[]>([])
	const [singleUrlInput, setSingleUrlInput] = useState('')
	const [batchUrlInput, setBatchUrlInput] = useState('')
	const [isBatchMode, setIsBatchMode] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	// 验证图片 URL 是否有效
	const validateImageUrl = (url: string): Promise<boolean> => {
		return new Promise(resolve => {
			const img = new window.Image()
			img.onload = () => resolve(true)
			img.onerror = () => resolve(false)
			img.src = url
		})
	}

	// 处理本地文件选择
	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || [])
		if (files.length === 0) return

		const nextImages: ImageItem[] = [...images]

		for (const file of files) {
			if (!file.type.startsWith('image/')) {
				toast.error('请选择图片文件')
				continue
			}

			const previewUrl = URL.createObjectURL(file)
			nextImages.push({
				type: 'file',
				file,
				previewUrl
			})
		}

		setImages(nextImages)
	}

	// 添加单个外链
	const handleAddSingleUrl = async () => {
		const url = singleUrlInput.trim()
		if (!url) {
			toast.error('请输入图片链接')
			return
		}

		// 检查是否已存在
		if (externalImages.some(img => img.url === url)) {
			toast.error('该链接已添加')
			return
		}

		// 添加并验证
		const newImage: ExternalImage = { url, status: 'pending' }
		setExternalImages(prev => [...prev, newImage])
		setSingleUrlInput('')

		const isValid = await validateImageUrl(url)
		setExternalImages(prev => prev.map(img => (img.url === url ? { ...img, status: isValid ? 'valid' : 'invalid' } : img)))

		if (!isValid) {
			toast.error('图片链接无效或无法加载')
		}
	}

	// 批量添加外链
	const handleBatchAdd = async () => {
		const urls = batchUrlInput
			.split('\n')
			.map(line => line.trim())
			.filter(line => line && (line.startsWith('http://') || line.startsWith('https://')))

		if (urls.length === 0) {
			toast.error('请输入有效的图片链接（每行一个）')
			return
		}

		// 过滤已存在的 URL
		const existingUrls = new Set(externalImages.map(img => img.url))
		const newUrls = urls.filter(url => !existingUrls.has(url))

		if (newUrls.length === 0) {
			toast.error('所有链接已存在')
			return
		}

		// 添加新链接
		const newImages: ExternalImage[] = newUrls.map(url => ({ url, status: 'pending' as const }))
		setExternalImages(prev => [...prev, ...newImages])
		setBatchUrlInput('')

		// 异步验证所有链接
		for (const url of newUrls) {
			const isValid = await validateImageUrl(url)
			setExternalImages(prev => prev.map(img => (img.url === url ? { ...img, status: isValid ? 'valid' : 'invalid' } : img)))
		}

		toast.success(`已添加 ${newUrls.length} 个链接`)
	}

	// 删除外链图片
	const handleRemoveExternalImage = (url: string) => {
		setExternalImages(prev => prev.filter(img => img.url !== url))
	}

	// 删除本地图片
	const handleRemoveLocalImage = (index: number) => {
		setImages(prev => {
			const image = prev[index]
			if (image.type === 'file') {
				URL.revokeObjectURL(image.previewUrl)
			}
			return prev.filter((_, i) => i !== index)
		})
	}

	// 清空所有外链
	const handleClearAllExternal = () => {
		setExternalImages([])
	}

	// 移除无效的外链
	const handleRemoveInvalid = () => {
		setExternalImages(prev => prev.filter(img => img.status !== 'invalid'))
	}

	// 提交
	const handleSubmit = () => {
		let finalImages: ImageItem[] = []

		if (activeTab === 'local') {
			if (images.length === 0) {
				toast.error('请至少选择一张图片')
				return
			}
			finalImages = images
		} else {
			const validExternalImages = externalImages.filter(img => img.status === 'valid')
			if (validExternalImages.length === 0) {
				toast.error('请至少添加一个有效的图片链接')
				return
			}
			finalImages = validExternalImages.map(img => ({ type: 'url' as const, url: img.url }))
		}

		onSubmit({
			images: finalImages,
			description
		})

		handleClose()
	}

	const handleClose = () => {
		images.forEach(image => {
			if (image.type === 'file') {
				URL.revokeObjectURL(image.previewUrl)
			}
		})
		setImages([])
		setExternalImages([])
		setDescription('')
		setSingleUrlInput('')
		setBatchUrlInput('')
		onClose()
	}

	const validCount = externalImages.filter(img => img.status === 'valid').length
	const invalidCount = externalImages.filter(img => img.status === 'invalid').length
	const pendingCount = externalImages.filter(img => img.status === 'pending').length

	return (
		<DialogModal open onClose={handleClose} className='card w-lg max-sm:w-full max-h-[90vh] overflow-hidden flex flex-col'>
			<div className='space-y-4 flex flex-col min-h-0'>
				<h2 className='text-xl font-bold shrink-0'>添加图片</h2>

				{/* Tab 切换 */}
				<div className='flex gap-1 p-1 bg-gray-100 rounded-xl shrink-0'>
					<button
						onClick={() => setActiveTab('local')}
						className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
							activeTab === 'local' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-primary'
						}`}>
						<Upload className='w-4 h-4' />
						本地上传
					</button>
					<button
						onClick={() => setActiveTab('external')}
						className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
							activeTab === 'external' ? 'bg-white text-primary shadow-sm' : 'text-secondary hover:text-primary'
						}`}>
						<Link className='w-4 h-4' />
						外链导入
					</button>
				</div>

				{/* 内容区域 */}
				<div className='flex-1 min-h-0 overflow-y-auto'>
					{activeTab === 'local' ? (
						/* 本地上传区域 */
						<div className='space-y-4'>
							<input ref={fileInputRef} type='file' accept='image/*' multiple className='hidden' onChange={handleFileSelect} />

							{images.length === 0 ? (
								<div
									onClick={() => fileInputRef.current?.click()}
									className='flex h-40 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition-all hover:border-brand hover:bg-brand/5'>
									<div className='text-center'>
										<Upload className='mx-auto mb-2 h-10 w-10 text-gray-400' />
										<p className='text-secondary text-sm font-medium'>点击选择图片</p>
										<p className='text-secondary/60 text-xs mt-1'>支持多选，可批量上传</p>
									</div>
								</div>
							) : (
								<>
									<div className='relative flex h-40 items-center justify-center overflow-visible rounded-xl bg-linear-to-br from-gray-50 to-gray-100'>
										{images.slice(0, 3).map((image, index) => (
											<div
												key={index}
												className={`absolute h-32 w-44 overflow-hidden rounded-xl border-4 border-white bg-white shadow-xl transition-transform ${
													index === 0 ? '-left-4 -translate-y-2 -rotate-6' : index === 1 ? 'z-20 rotate-1' : 'right-0 translate-y-2 rotate-6'
												}`}>
												<img src={image.type === 'file' ? image.previewUrl : image.url} alt={`preview-${index}`} className='h-full w-full object-cover' />
											</div>
										))}

										{images.length > 3 && (
											<div className='absolute right-4 -bottom-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white shadow-lg'>共 {images.length} 张</div>
										)}
									</div>

									<div className='mt-3 flex items-center justify-between'>
										<span className='text-secondary text-sm'>已选择 {images.length} 张图片</span>
										<div className='flex gap-2'>
											<button
												type='button'
												onClick={() => setImages([])}
												className='rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50'>
												清空
											</button>
											<button
												type='button'
												onClick={() => fileInputRef.current?.click()}
												className='rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 transition-colors hover:bg-gray-50'>
												继续添加
											</button>
										</div>
									</div>
								</>
							)}
						</div>
					) : (
						/* 外链导入区域 */
						<div className='space-y-4'>
							{/* 模式切换 */}
							<div className='flex gap-2'>
								<button
									onClick={() => setIsBatchMode(false)}
									className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
										!isBatchMode ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-secondary hover:text-primary'
									}`}>
									单个添加
								</button>
								<button
									onClick={() => setIsBatchMode(true)}
									className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
										isBatchMode ? 'bg-brand/10 text-brand' : 'bg-gray-100 text-secondary hover:text-primary'
									}`}>
									批量导入
								</button>
							</div>

							{!isBatchMode ? (
								/* 单个添加 */
								<div className='flex gap-2'>
									<input
										type='url'
										value={singleUrlInput}
										onChange={e => setSingleUrlInput(e.target.value)}
										onKeyDown={e => e.key === 'Enter' && handleAddSingleUrl()}
										placeholder='输入图片直链，如 https://example.com/image.jpg'
										className='flex-1 rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm focus:border-brand focus:ring-1 focus:ring-brand transition-all'
									/>
									<button onClick={handleAddSingleUrl} className='brand-btn px-4 py-2.5 shrink-0'>
										<Plus className='w-4 h-4' />
									</button>
								</div>
							) : (
								/* 批量添加 */
								<div className='space-y-2'>
									<textarea
										value={batchUrlInput}
										onChange={e => setBatchUrlInput(e.target.value)}
										placeholder={'粘贴多个图片链接，每行一个：\nhttps://example.com/image1.jpg\nhttps://example.com/image2.jpg\nhttps://example.com/image3.jpg'}
										className='w-full h-32 rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:border-brand focus:ring-1 focus:ring-brand transition-all resize-none'
									/>
									<button onClick={handleBatchAdd} className='brand-btn w-full py-2.5 justify-center'>
										<Plus className='w-4 h-4 mr-1' />
										批量添加
									</button>
								</div>
							)}

							{/* 已添加的外链列表 */}
							{externalImages.length > 0 && (
								<div className='space-y-3'>
									<div className='flex items-center justify-between'>
										<div className='flex items-center gap-3 text-sm'>
											<span className='text-primary font-medium'>已添加 {externalImages.length} 个链接</span>
											{validCount > 0 && (
												<span className='flex items-center gap-1 text-green-600'>
													<CheckCircle2 className='w-3.5 h-3.5' />
													{validCount} 有效
												</span>
											)}
											{invalidCount > 0 && (
												<span className='flex items-center gap-1 text-red-500'>
													<AlertCircle className='w-3.5 h-3.5' />
													{invalidCount} 无效
												</span>
											)}
											{pendingCount > 0 && <span className='text-secondary'>{pendingCount} 验证中...</span>}
										</div>
										<div className='flex gap-2'>
											{invalidCount > 0 && (
												<button onClick={handleRemoveInvalid} className='text-xs text-red-500 hover:text-red-600'>
													移除无效
												</button>
											)}
											<button onClick={handleClearAllExternal} className='text-xs text-secondary hover:text-primary'>
												清空全部
											</button>
										</div>
									</div>

									<div className='grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1'>
										{externalImages.map((img, index) => (
											<div key={index} className='relative group aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200'>
												{img.status === 'pending' ? (
													<div className='absolute inset-0 flex items-center justify-center'>
														<div className='w-5 h-5 border-2 border-brand border-t-transparent rounded-full animate-spin' />
													</div>
												) : img.status === 'valid' ? (
													<img src={img.url} alt={`external-${index}`} className='w-full h-full object-cover' />
												) : (
													<div className='absolute inset-0 flex flex-col items-center justify-center bg-red-50'>
														<AlertCircle className='w-6 h-6 text-red-400' />
														<span className='text-xs text-red-500 mt-1'>加载失败</span>
													</div>
												)}

												{/* 状态指示器 */}
												<div
													className={`absolute top-1 left-1 w-2 h-2 rounded-full ${
														img.status === 'valid' ? 'bg-green-500' : img.status === 'invalid' ? 'bg-red-500' : 'bg-yellow-500'
													}`}
												/>

												{/* 删除按钮 */}
												<button
													onClick={() => handleRemoveExternalImage(img.url)}
													className='absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
													<X className='w-3 h-3' />
												</button>
											</div>
										))}
									</div>
								</div>
							)}

							{externalImages.length === 0 && (
								<div className='flex flex-col items-center justify-center py-8 text-center'>
									<ImageIcon className='w-12 h-12 text-gray-300 mb-3' />
									<p className='text-secondary text-sm'>还没有添加图片链接</p>
									<p className='text-secondary/60 text-xs mt-1'>支持 jpg、png、gif、webp 等常见图片格式</p>
								</div>
							)}
						</div>
					)}
				</div>

				{/* 描述输入 */}
				<div className='shrink-0'>
					<label className='text-secondary mb-2 block text-sm font-medium'>描述（可选）</label>
					<textarea
						value={description}
						onChange={e => setDescription(e.target.value)}
						placeholder='这组图片的说明...'
						className='w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-brand focus:ring-1 focus:ring-brand transition-all resize-none'
						rows={2}
					/>
				</div>

				{/* 底部按钮 */}
				<div className='flex gap-3 shrink-0'>
					<button
						type='button'
						onClick={handleClose}
						className='flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium transition-colors hover:bg-gray-50'>
						取消
					</button>
					<button type='button' onClick={handleSubmit} className='brand-btn flex-1 justify-center px-4 py-2.5'>
						{activeTab === 'local' ? `上传 ${images.length} 张图片` : `添加 ${validCount} 张图片`}
					</button>
				</div>
			</div>
		</DialogModal>
	)
}
