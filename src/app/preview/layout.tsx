'use client'

/**
 * 媒体预览专用布局
 * 干净的全屏模式，无导航栏和页脚
 * 用于 iframe 嵌入场景
 */
export default function PreviewLayout({
	children
}: {
	children: React.ReactNode
}) {
	return (
		<div className="min-h-screen w-full bg-black flex items-center justify-center">
			{children}
		</div>
	)
}
