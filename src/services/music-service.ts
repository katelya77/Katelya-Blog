import { toast } from 'sonner'
import { GITHUB_CONFIG } from '@/consts'
import { getAuthToken } from '@/lib/auth'
import { createBlob, createCommit, createTree, getRef, toBase64Utf8, type TreeItem, updateRef } from '@/lib/github-client'
import type { MusicTrack } from '@/stores/music-player-store'

export interface PlaylistData {
	tracks: MusicTrack[]
}

/**
 * 保存音乐播放列表到 GitHub 仓库
 */
export async function savePlaylist(tracks: MusicTrack[]): Promise<void> {
	const token = await getAuthToken()

	toast.info('正在获取分支信息...')
	const refData = await getRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`)
	const latestCommitSha = refData.sha

	const treeItems: TreeItem[] = []

	// 准备播放列表 JSON
	const playlistData: PlaylistData = { tracks }
	const playlistJson = JSON.stringify(playlistData, null, '\t')
	const playlistBlob = await createBlob(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, toBase64Utf8(playlistJson), 'base64')

	treeItems.push({
		path: 'public/music/playlist.json',
		mode: '100644',
		type: 'blob',
		sha: playlistBlob.sha
	})

	toast.info('正在创建提交...')
	const treeData = await createTree(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, treeItems, latestCommitSha)
	const commitMessage = `更新音乐播放列表 (${tracks.length} 首)`
	const commitData = await createCommit(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, commitMessage, treeData.sha, [latestCommitSha])

	toast.info('正在更新分支...')
	await updateRef(token, GITHUB_CONFIG.OWNER, GITHUB_CONFIG.REPO, `heads/${GITHUB_CONFIG.BRANCH}`, commitData.sha)

	toast.success('播放列表已保存！')
}

/**
 * 从仓库加载播放列表
 */
export async function loadPlaylistFromRepo(): Promise<MusicTrack[]> {
	try {
		const response = await fetch('/music/playlist.json', { cache: 'no-store' })
		if (!response.ok) {
			return []
		}
		const data: PlaylistData = await response.json()
		return data.tracks || []
	} catch (error) {
		console.error('Failed to load playlist:', error)
		return []
	}
}
