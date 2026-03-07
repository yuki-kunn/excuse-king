<style>
  /* 全体の背景（少し暗めの色） */
  :global(body) {
    margin: 0;
    padding: 0;
    /* 丸みのあるフォントを指定して少しポップに */
    font-family: 'Kosugi Maru', 'Hiragino Maru Gothic ProN', 'Nunito', sans-serif;
    background-color: #2b2b2b; 
    color: #222;
  }

  .app-container {
    max-width: 480px; /* スマホの横幅に合わせる */
    margin: 0 auto;
    background-color: #f4f4f0; /* アプリの背景色は少しレトロなオフホワイト */
    min-height: 100vh;
    position: relative;
    box-shadow: 0 0 20px rgba(0,0,0,0.8); /* 画面全体に影をつける */
  }

  .content {
    padding-bottom: 80px; /* ナビゲーションバーの分の余白 */
    min-height: 100vh;
    box-sizing: border-box;
  }
</style>