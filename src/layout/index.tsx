'use client'
import { PropsWithChildren } from 'react'
import { usePathname } from 'next/navigation'
import { useCenterInit } from '@/hooks/use-center'
import BlurredBubblesBackground from './backgrounds/blurred-bubbles'
import SnowfallBackground from './backgrounds/snowfall'
import NavCard from '@/components/nav-card'
import { Toaster } from 'sonner'
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon } from 'lucide-react'
import { useSize, useSizeInit } from '@/hooks/use-size'
import { useConfigStore } from '@/app/(home)/stores/config-store'
import { ScrollTopButton } from '@/components/scroll-top-button'
import { GlobalAudioProvider } from '@/components/global-audio-provider'
import { FloatingMiniPlayer } from '@/components/floating-mini-player'

export default function Layout({ children }: PropsWithChildren) {
	const pathname = usePathname()
	
	// 预览模式：完全干净的布局
	const isPreviewMode = pathname?.startsWith('/preview')
	
	useCenterInit()
	useSizeInit()
	const { siteContent, regenerateKey } = useConfigStore()
	const { maxSM, init } = useSize()
	
	// 预览模式下只渲染内容，不渲染任何全局组件
	if (isPreviewMode) {
		return <>{children}</>
	}

	const backgroundImages = (siteContent.backgroundImages ?? []) as Array<{ id: string; url: string }>
	const currentBackgroundImageId = siteContent.currentBackgroundImageId
	const currentBackgroundImage =
		currentBackgroundImageId && currentBackgroundImageId.trim() ? backgroundImages.find(item => item.id === currentBackgroundImageId) : null

	return (
		<>
			<Toaster
				position='bottom-right'
				richColors
				icons={{
					success: <CircleCheckIcon className='size-4' />,
					info: <InfoIcon className='size-4' />,
					warning: <TriangleAlertIcon className='size-4' />,
					error: <OctagonXIcon className='size-4' />,
					loading: <Loader2Icon className='size-4 animate-spin' />
				}}
				style={
					{
						'--border-radius': '12px'
					} as React.CSSProperties
				}
			/>
			{currentBackgroundImage && (
				<div
					className='fixed inset-0 z-0 overflow-hidden'
					style={{
						backgroundImage: `url(${currentBackgroundImage.url})`,
						backgroundSize: 'cover',
						backgroundPosition: 'center',
						backgroundRepeat: 'no-repeat'
					}}
				/>
			)}
			<BlurredBubblesBackground colors={siteContent.backgroundColors} regenerateKey={regenerateKey} />

			{/* 全局音频管理器 */}
			<GlobalAudioProvider />

			<main className='relative z-10 h-full'>
				{children}
				<NavCard />
			</main>

			{/* 悬浮迷你播放器（非首页时显示） */}
			<FloatingMiniPlayer />

			{maxSM && init && <ScrollTopButton className='bg-brand/20 fixed right-6 bottom-8 z-50 shadow-md' />}
		</>
	)
}
