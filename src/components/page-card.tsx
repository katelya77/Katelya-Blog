'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { SnowDecoration, type SnowPreset } from '@/components/snow-decoration'
import { forwardRef, type ReactNode } from 'react'

interface PageCardProps {
	children?: ReactNode
	className?: string
	/** 积雪装饰预设 */
	snowPreset?: SnowPreset
	/** 是否启用动画 */
	animate?: boolean
	/** 动画延迟（秒） */
	delay?: number
}

/**
 * 页面通用卡片组件
 * 用于非首页的各种卡片容器，支持积雪装饰
 * 
 * @example
 * <PageCard snowPreset="cardMedium" className="p-6">
 *   <h2>内容</h2>
 * </PageCard>
 */
export const PageCard = forwardRef<HTMLDivElement, PageCardProps>(
	({ children, className, snowPreset, animate = true, delay = 0 }, ref) => {
		const baseClass = 'card relative p-6'

		if (animate) {
			return (
				<motion.div
					ref={ref}
					initial={{ opacity: 0, scale: 0.8 }}
					animate={{ opacity: 1, scale: 1 }}
					transition={{ delay }}
					className={cn(baseClass, className)}
				>
					{snowPreset && <SnowDecoration preset={snowPreset} />}
					{children}
				</motion.div>
			)
		}

		return (
			<div ref={ref} className={cn(baseClass, className)}>
				{snowPreset && <SnowDecoration preset={snowPreset} />}
				{children}
			</div>
		)
	}
)

PageCard.displayName = 'PageCard'

/**
 * 简单的静态卡片包装器
 * 仅用于添加积雪效果到现有容器
 */
interface SnowCardWrapperProps {
	children: React.ReactNode
	className?: string
	snowPreset?: SnowPreset
}

export function SnowCardWrapper({ children, className, snowPreset = 'cardMedium' }: SnowCardWrapperProps) {
	return (
		<div className={cn('relative', className)}>
			<SnowDecoration preset={snowPreset} />
			{children}
		</div>
	)
}
