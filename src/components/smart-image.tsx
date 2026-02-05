'use client'

import { useState, useCallback, ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type FallbackType = 'article' | 'project' | 'custom'

// 默认回退图片 API
const FALLBACK_URLS = {
	article: 'https://t.alcy.cc/ycy',
	project: 'https://t.alcy.cc/ai'
} as const

interface SmartImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
	src?: string | null
	fallbackType?: FallbackType
	customFallback?: string
	enableLazyLoad?: boolean
}

/**
 * 智能图片组件
 * 支持空值判断和自动回退到默认图片
 */
export function SmartImage({
	src,
	alt = '',
	fallbackType = 'article',
	customFallback,
	enableLazyLoad = true,
	className,
	style,
	...props
}: SmartImageProps) {
	const [hasError, setHasError] = useState(false)
	const [isLoading, setIsLoading] = useState(true)

	// 确定最终显示的图片 URL
	const getImageUrl = useCallback(() => {
		// 如果 src 为空或已出错，使用回退图片
		if (!src || src.trim() === '' || hasError) {
			if (customFallback) return customFallback
			return FALLBACK_URLS[fallbackType as keyof typeof FALLBACK_URLS] || FALLBACK_URLS.article
		}
		return src
	}, [src, hasError, customFallback, fallbackType])

	const handleError = () => {
		if (!hasError) {
			setHasError(true)
		}
		setIsLoading(false)
	}

	const handleLoad = () => {
		setIsLoading(false)
	}

	const imageUrl = getImageUrl()

	return (
		<div className={cn('relative overflow-hidden', className)} style={style}>
			{isLoading && (
				<div className='absolute inset-0 animate-pulse bg-gray-200/50' />
			)}
			<img
				src={imageUrl}
				alt={alt}
				loading={enableLazyLoad ? 'lazy' : undefined}
				onError={handleError}
				onLoad={handleLoad}
				className={cn(
					'h-full w-full object-cover transition-opacity duration-300',
					isLoading ? 'opacity-0' : 'opacity-100'
				)}
				{...props}
			/>
		</div>
	)
}

/**
 * 封面图片组件（用于文章写作页面）
 */
export function ArticleCoverImage(props: Omit<SmartImageProps, 'fallbackType'>) {
	return <SmartImage {...props} fallbackType='article' />
}

/**
 * 项目封面图片组件
 */
export function ProjectCoverImage(props: Omit<SmartImageProps, 'fallbackType'>) {
	return <SmartImage {...props} fallbackType='project' />
}
