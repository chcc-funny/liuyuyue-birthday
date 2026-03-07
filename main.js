document.addEventListener('DOMContentLoaded', () => {

    // --- 1. 照片画廊 Swiper 初始化 (Grid Layout) ---
    const photos = [
        { src: 'photos/05.webp', text: '姐姐经常陪我玩' },
        { src: 'photos/01.webp', text: '我从妈妈大肚子里蹦出来了！' },
        { src: 'photos/02.webp', text: '我有时候有空就玩脚趾哈哈' },
        { src: 'photos/03.webp', text: '粉粉的小发夹好看吗' },
        { src: 'photos/04.webp', text: '爸爸妈妈还带我第一次去看海' },
        { src: 'photos/06.webp', text: '老爸不经常陪我玩' },
        { src: 'photos/07.webp', text: '姐姐经常陪我玩' },
        { src: 'photos/08.webp', text: '姐姐' },
        { src: 'photos/09.webp', text: '一出来我就会游泳了，厉害吧？' },
        { src: 'photos/10.webp', text: '我喜欢紫色(主要是妈妈喜欢)' },
        { src: 'photos/11.webp', text: '看烟花我都不眨眼，厉害吧。' }
    ];

    // Helper: Chunk array
    const chunkArray = (arr, size) => arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
    // 4 photos per page
    const photoPages = chunkArray(photos, 4);

    const swiperWrapper = document.querySelector('.swiper-wrapper');
    const lightbox = document.getElementById('magic-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxText = document.getElementById('lightbox-text');
    const lightboxBg = document.getElementById('lightbox-bg');
    const lightboxContent = document.getElementById('lightbox-content');

    photoPages.forEach((pagePhotos, pageIndex) => {
        // 创建每一页
        const slide = document.createElement('div');
        slide.className = 'swiper-slide';

        // 创建照片网格
        const grid = document.createElement('div');
        grid.className = 'photo-grid';

        // 渲染每一页中的 4 张相片
        pagePhotos.forEach((photo, idx) => {
            const item = document.createElement('div');
            // 交替给相片加上轻微的随机旋转角度
            const rotations = ['rotate-[-3deg]', 'rotate-[4deg]', 'rotate-[2deg]', 'rotate-[-4deg]'];
            const rotClass = rotations[idx % 4];
            item.className = `photo-item transform ${rotClass}`;

            item.innerHTML = `
                <div class="photo-inner">
                    <img src="${photo.src}" alt="${photo.text}" class="photo-img shadow-sm">
                    <div class="photo-caption font-bold">${photo.text}</div>
                </div>
            `;

            // 魔法立体放大点击事件
            item.addEventListener('click', () => {
                // 打开 Lightbox
                lightboxImg.src = photo.src;
                lightboxText.textContent = photo.text;

                lightbox.classList.remove('opacity-0', 'pointer-events-none');
                lightbox.classList.add('opacity-100', 'pointer-events-auto');

                // 延迟执行缩放，触发 CSS 魔法回弹过渡
                requestAnimationFrame(() => {
                    lightboxContent.classList.remove('magic-3d-start');
                    lightboxContent.classList.add('magic-3d-end');

                    // 触发魔法棒和星星特效
                    triggerMagicEffect();
                });
            });

            grid.appendChild(item);
        });

        slide.appendChild(grid);
        swiperWrapper.appendChild(slide);
    });

    // 点击空白处（背景）关闭 Lightbox
    lightboxBg.addEventListener('click', () => {
        // 恢复初始缩放状态
        lightboxContent.classList.remove('magic-3d-end');
        lightboxContent.classList.add('magic-3d-start');

        // 淡出背景
        lightbox.classList.remove('opacity-100', 'pointer-events-auto');
        lightbox.classList.add('opacity-0', 'pointer-events-none');
    });

    // 初始化 Swiper
    // 改变 effect 为更符合书页的翻动体验（或简单的滑动）
    const swiper = new Swiper('.mySwiper', {
        effect: 'slide',
        speed: 600,
        grabCursor: true,
        pagination: {
            el: '.swiper-pagination',
            clickable: true,
            dynamicBullets: true
        },
    });


    // --- 2. 滚动淡入动画 (Intersection Observer) ---
    const fadeElements = document.querySelectorAll('.fade-in');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    fadeElements.forEach(el => observer.observe(el));


    // --- 3. 背景音乐控制 ---
    const bgm = document.getElementById('bgm');
    const musicControl = document.getElementById('music-control');
    const musicIcon = document.getElementById('music-icon');
    let isPlaying = false;
    let firstInteraction = false;

    // 音乐播放逻辑
    const toggleMusic = () => {
        if (isPlaying) {
            bgm.pause();
            musicIcon.classList.remove('spin-anim');
            musicIcon.classList.remove('fa-music');
            musicIcon.classList.add('fa-volume-mute');
        } else {
            bgm.play().then(() => {
                musicIcon.classList.add('spin-anim');
                musicIcon.classList.remove('fa-volume-mute');
                musicIcon.classList.add('fa-music');
            }).catch(e => {
                console.log('播放失败', e);
            });
        }
        isPlaying = !isPlaying;
    };

    musicControl.addEventListener('click', toggleMusic);

    // 移动端自动播放限制处理：用户第一次点击页面任意位置时尝试播放
    document.body.addEventListener('touchstart', () => {
        if (!firstInteraction) {
            firstInteraction = true;
            toggleMusic();
        }
    }, { once: true });


    // --- 4. 飞书表单集成提交逻辑 ---
    const form = document.getElementById('rsvp-form');
    const submitBtn = document.getElementById('submit-btn');
    const formMsg = document.getElementById('form-msg');

    // Cloudflare Worker 代理 URL（解决 CORS 问题）
    const WORKER_URL = 'https://feishu-proxy.liu332737827.workers.dev';

    const APP_ID = 'cli_a90716a41df91bd7';
    const APP_SECRET = '0Clk4zaqwHd3K46eT3HL3elGLq3rzGgL';
    const APP_TOKEN = 'BXJDwchkLijjIkkCluacrMDsnog'; // 知识库文档 ID
    const TABLE_ID = 'tblFbzk0cieXBcJy'; // 表格 ID

    const showMsg = (msg, isSuccess) => {
        formMsg.textContent = msg;
        formMsg.className = `relative z-10 text-center text-sm font-bold py-2 mt-3 rounded-lg block border border-[#dcd0c0] ${isSuccess ? 'bg-[#e8f5e9] text-[#2e7d32]' : 'bg-[#ffebee] text-[#c62828]'}`;
        setTimeout(() => {
            formMsg.classList.add('hidden');
            formMsg.classList.remove('block');
        }, 5000);
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const guestName = document.getElementById('guest-name').value;
        const guestCount = document.getElementById('guest-count').value;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';
        submitBtn.classList.add('opacity-70');

        try {
            // 1. 通过 Worker 代理获取 Token
            const tokenRes = await fetch(`${WORKER_URL}/api/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
            });

            const tokenData = await tokenRes.json();
            if (tokenData.code !== 0) throw new Error('获取 Token 失败:' + tokenData.msg);

            const tenantAccessToken = tokenData.tenant_access_token;

            // 2. 通过 Worker 代理写入记录
            const writeRes = await fetch(`${WORKER_URL}/api/record`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant_access_token: tenantAccessToken,
                    app_token: APP_TOKEN,
                    table_id: TABLE_ID,
                    record_data: {
                        fields: {
                            "来宾姓名": guestName,
                            "赴宴人数": guestCount
                        }
                    }
                })
            });

            const writeData = await writeRes.json();

            if (writeData.code === 0) {
                showMsg('收到您的回执啦！期待与您相聚~', true);
                form.reset();
            } else {
                throw new Error('写入表格失败:' + writeData.msg);
            }

        } catch (error) {
            console.error(error);
            showMsg('哎呀，信使迷路了，请直接联系麻麻。', false);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 提交 Submit';
            submitBtn.classList.remove('opacity-70');
        }
    });
    function triggerMagicEffect() {
        const wand = document.getElementById('magic-wand');
        const starsContainer = document.getElementById('magic-stars-container');

        // 重置动画
        wand.classList.remove('active');
        void wand.offsetWidth; // 触发重绘
        wand.classList.add('active');

        // 清理旧的星星
        starsContainer.innerHTML = '';

        // 生成星星
        const numStars = 25;
        const colors = ['#f4d03f', '#ffed4a', '#a1d0ba', '#ffced6', '#ffffff'];

        for (let i = 0; i < numStars; i++) {
            setTimeout(() => {
                const star = document.createElement('i');
                const isSparkle = Math.random() > 0.5;
                star.className = `fas ${isSparkle ? 'fa-sparkles' : 'fa-star'} magic-star-particle`;

                star.style.color = colors[Math.floor(Math.random() * colors.length)];

                // 魔法棒起始位置大概在左上角
                const startX = (Math.random() * 40) - 10 + '%';
                const startY = (Math.random() * 40) - 10 + '%';
                star.style.left = startX;
                star.style.top = startY;

                star.style.setProperty('--tx', `${(Math.random() - 0.5) * 300}px`);
                star.style.setProperty('--ty', `${(Math.random() - 0.5) * 300 - 50}px`);
                star.style.setProperty('--s', `${Math.random() * 1.5 + 0.5}`);
                star.style.setProperty('--r', `${Math.random() * 360}deg`);

                const duration = Math.random() * 1 + 0.5;
                star.style.animation = `star-burst ${duration}s ease-out forwards`;

                starsContainer.appendChild(star);

                setTimeout(() => {
                    if (star.parentNode === starsContainer) {
                        star.remove();
                    }
                }, duration * 1000);
            }, i * 40); // 间隔生成持续喷射
        }
    }

});
