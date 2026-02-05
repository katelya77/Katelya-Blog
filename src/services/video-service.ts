import { toast } from 'sonner'
import { GITHUB_CONFIG } from '@/consts'
import { getAuthToken } from '@/lib/auth'
import { createBlob, createCommit, createTree, getRef, toBase64Utf8, type TreeItem, updateRef } from '@/lib/github-client'
import type { VideoItem } from '@/stores/video-player-store'

export interface VideoPlaylistData {
	videos: VideoItem[]
}

/**
 * 保存视频播放列表到 GitHub 仓库
 */
export async function saveVideoPlaylist(videos: VideoItem[]): Promise<void> {
	const token = await getAuthToken()

	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	const treeItems: TreeItem[] = []

	// 准备视频列表 JSON
	const playlistData: VideoPlaylistData = { videos }
	const playlistJson = JSON.stringify(playlistData, null, '\t')
	const playlistBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(playlistJson), 'base64')

	treeItems.push({
		path: 'public/video/playlist.json',
		mode: '100644',
		type: 'blob',
		sha: playlistBlob.sha
	})

	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
	const commitMessage = `更新视频播放列表 (${videos.length} 个)`
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)
}

/**
 * 从仓库加载视频播放列表
 */
export async function loadVideoPlaylistFromRepo(): Promise<VideoItem[]> {
	try {
		const response = await fetch('/video/playlist.json', { cache: 'no-store' })
		if (!response.ok) {
			return []
		}
		const data: VideoPlaylistData = await response.json()
		return data.videos || []
	} catch (error) {
		console.error('Failed to load video playlist:', error)
		return []
	}
}
