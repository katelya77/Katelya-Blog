import { toast } from 'sonner'
import { GITHUB_CONFIG } from '@/consts'
import { getAuthToken } from '@/lib/auth'
import { createBlob, createCommit, createTree, getRef, toBase64Utf8, type TreeItem, updateRef } from '@/lib/github-client'
import type { MusicTrack } from '@/stores/music-player-store'
import type { VideoItem } from '@/stores/video-player-store'

export interface MediaData {
	music: MusicTrack[]
	videos: VideoItem[]
}

/**
 * 保存所有媒体数据到 GitHub 仓库（音乐 + 视频）
 */
export async function saveAllMedia(music: MusicTrack[], videos: VideoItem[]): Promise<void> {
	const token = await getAuthToken()

	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	const treeItems: TreeItem[] = []

	// 准备音乐播放列表 JSON
	const musicData = { tracks: music }
	const musicJson = JSON.stringify(musicData, null, '\t')
	const musicBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(musicJson), 'base64')
	treeItems.push({
		path: 'public/music/playlist.json',
		mode: '100644',
		type: 'blob',
		sha: musicBlob.sha
	})

	// 准备视频播放列表 JSON
	const videoData = { videos }
	const videoJson = JSON.stringify(videoData, null, '\t')
	const videoBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(videoJson), 'base64')
	treeItems.push({
		path: 'public/video/playlist.json',
		mode: '100644',
		type: 'blob',
		sha: videoBlob.sha
	})

	toast.info('正在创建提交...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
	const commitMessage = `更新媒体库 (${music.length} 首音乐, ${videos.length} 个视频)`
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success('媒体库已保存！')
}
