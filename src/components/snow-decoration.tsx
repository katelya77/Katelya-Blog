'use client'

import { useConfigStore } from '@/app/(home)/stores/config-store'
import { cn } from '@/lib/utils'

/**
 * 积雪装饰配置预设
 * 每个预设包含不同位置和大小的积雪图片
 */
export type SnowPreset =
	| 'hiCard'           // 问候卡片 - 左上+右下
	| 'artCard'          // 艺术卡片 - 右上
	| 'navCard'          // 导航卡片 - 左上
	| 'clockCard'        // 时钟卡片 - 左下+右上
	| 'calendarCard'     // 日历卡片 - 右上
	| 'writeButton'      // 写作按钮 - 右下
	| 'articleCard'      // 文章卡片 - 左上
	| 'musicCard'        // 音乐卡片 - 左上+右上
	| 'shareCard'        // 分享卡片 - 左上
	| 'likeButton'       // 点赞按钮 - 左上
	| 'modal'            // 模态框 - 顶部两侧
	| 'capsule'          // 胶囊形 - 左右两侧
	| 'cardSmall'        // 小卡片通用 - 单侧
	| 'cardMedium'       // 中卡片通用 - 顶部
	| 'cardLarge'        // 大卡片通用 - 多侧

interface SnowImage {
	src: string
	style: React.CSSProperties
}

const presetConfigs: Record<SnowPreset, SnowImage[]> = {
	hiCard: [
		{ src: '/images/christmas/snow-1.webp', style: { width: 180, left: -20, top: -25, opacity: 0.9 } },
		{ src: '/images/christmas/snow-2.webp', style: { width: 160, bottom: -12, right: -8, opacity: 0.9 } }
	],
	artCard: [
		{ src: '/images/christmas/snow-3.webp', style: { width: 160, right: -8, top: -16, opacity: 0.9 } }
	],
	navCard: [
		{ src: '/images/christmas/snow-4.webp', style: { width: 160, left: -18, top: -20, opacity: 0.9 } }
	],
	clockCard: [
		{ src: '/images/christmas/snow-5.webp', style: { width: 60, left: 2, bottom: 2, opacity: 0.6 } },
		{ src: '/images/christmas/snow-6.webp', style: { width: 80, right: -4, top: -10, opacity: 0.6 } }
	],
	calendarCard: [
		{ src: '/images/christmas/snow-7.webp', style: { width: 150, right: -12, top: -12, opacity: 0.8 } }
	],
	writeButton: [
		{ src: '/images/christmas/snow-8.webp', style: { width: 60, right: -8, bottom: -4, opacity: 0.8 } }
	],
	articleCard: [
		{ src: '/images/christmas/snow-9.webp', style: { width: 140, left: -12, top: -16, opacity: 0.8 } }
	],
	musicCard: [
		{ src: '/images/christmas/snow-10.webp', style: { width: 120, left: -8, top: -12, opacity: 0.8 } },
		{ src: '/images/christmas/snow-11.webp', style: { width: 80, right: -10, top: -12, opacity: 0.8 } }
	],
	shareCard: [
		{ src: '/images/christmas/snow-12.webp', style: { width: 120, left: -12, top: -12, opacity: 0.8 } }
	],
	likeButton: [
		{ src: '/images/christmas/snow-13.webp', style: { width: 40, left: -4, top: -4, opacity: 0.9 } }
	],
	modal: [
		{ src: '/images/christmas/snow-1.webp', style: { width: 140, left: -16, top: -20, opacity: 0.8 } },
		{ src: '/images/christmas/snow-3.webp', style: { width: 120, right: -12, top: -16, opacity: 0.8 } }
	],
	capsule: [
		{ src: '/images/christmas/snow-10.webp', style: { width: 100, left: -8, top: -10, opacity: 0.8 } },
		{ src: '/images/christmas/snow-11.webp', style: { width: 60, right: -8, top: -10, opacity: 0.8 } }
	],
	cardSmall: [
		{ src: '/images/christmas/snow-13.webp', style: { width: 60, left: -6, top: -6, opacity: 0.8 } }
	],
	cardMedium: [
		{ src: '/images/christmas/snow-7.webp', style: { width: 120, right: -10, top: -12, opacity: 0.8 } }
	],
	cardLarge: [
		{ src: '/images/christmas/snow-4.webp', style: { width: 160, left: -16, top: -18, opacity: 0.85 } },
		{ src: '/images/christmas/snow-2.webp', style: { width: 140, right: -10, bottom: -10, opacity: 0.85 } }
	]
}

interface SnowDecorationProps {
	/** 使用预设配置 */
	preset?: SnowPreset
	/** 自定义积雪图片配置，会覆盖预设 */
	images?: SnowImage[]
	/** 额外的容器类名 */
	className?: string
	/** 是否强制显示（忽略全局 enableChristmas 设置） */
	forceShow?: boolean
}

/**
 * 积雪装饰组件
 * 用于在卡片、按钮、模态框等容器四周添加积雪效果
 * 
 * @example
 * // 使用预设
 * <SnowDecoration preset="hiCard" />
 * 
 * // 自定义配置
 * <SnowDecoration images={[
 *   { src: '/images/christmas/snow-1.webp', style: { width: 100, left: -10, top: -10 } }
 * ]} />
 */
export function SnowDecoration({ preset, images, className, forceShow = false }: SnowDecorationProps) {
	const { siteContent } = useConfigStore()
	
	// 检查是否启用圣诞装饰
	if (!forceShow && !siteContent.enableChristmas) {
		return null
	}

	// 获取要渲染的图片配置
	const snowImages = images ?? (preset ? presetConfigs[preset] : [])

	if (snowImages.length === 0) {
		return null
	}

	return (
		<>
			{snowImages.map((image, index) => (
				<img
					key={index}
					src={image.src}
					alt='Snow decoration'
					className={cn('pointer-events-none absolute', className)}
					style={image.style}
				/>
			))}
		</>
	)
}

/**
 * Hook: 检查是否启用圣诞装饰
 */
export function useChristmasEnabled() {
	const { siteContent } = useConfigStore()
	return siteContent.enableChristmas ?? false
}

export { presetConfigs }
export type { SnowImage }
