const express = require('express');
const ytsr = require('ytsr');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.get('/search', async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).send('検索キーワード (q) をURLパラメーターで指定してください。例: /search?q=gohan');
    }

    try {
        const searchResults = await ytsr(q, { limit: 1 }); // 最初の1件だけを取得
        const firstResult = searchResults.items.find(item => item.type === 'video');

        if (!firstResult) {
            return res.status(404).send('検索結果が見つかりませんでした。');
        }

        const videoUrl = firstResult.url;
        res.send(`見つかった動画のURL: ${videoUrl}`);

    } catch (error) {
        console.error(error);
        res.status(500).send('検索中にエラーが発生しました。');
    }
});

app.get('/download', (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).send('動画のURL (url) をURLパラメーターで指定してください。例: /download?url=https://www.youtube.com/watch?v=xxxxxxxxxxx');
    }

    // yt-dlpを実行
    const ytdlp = spawn('yt-dlp', [url, '-o', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });

    // ダウンロードしたデータをストリーミング
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');

    ytdlp.stdout.pipe(res);

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp exited with code ${code}`);
        }
    });

    ytdlp.on('error', (err) => {
        console.error('yt-dlp failed to start.', err);
        res.status(500).send('yt-dlpの実行に失敗しました。');
    });
});

app.listen(port, () => {
    console.log(`サーバーがポート ${port} で起動しました。`);
});
