// portal-frontend/js/app.js
// 顶部的 import 语句需要包含新的API函数
import { registerUser, loginUser, getUserProfile, logoutUser, getToken, getCurrentUser, transferScore } from './api.js'; // 添加 transferScore

// ... (DOMContentLoaded 和其他 init 函数保持你之前的版本) ...
// 例如:
// document.addEventListener('DOMContentLoaded', () => { /* ... */ });
// function initRegisterPage() { /* ... */ }
// function initLoginPage() { /* ... */ }


async function initIndexPage() {
    console.log("Portal_App.js: initIndexPage called - V3_ScoreManagement");
    // ... (token 获取和大部分DOM元素获取与上一版一致) ...
    const scoreManagementBtn = document.getElementById('scoreManagementBtn'); // 获取积分管理按钮

    // --- 新增：模态框相关的DOM元素获取 ---
    const transferScoreModal = document.getElementById('transferScoreModal');
    const closeTransferModalBtn = document.getElementById('closeTransferModalBtn');
    const transferScoreForm = document.getElementById('transferScoreForm');
    const transferMessageEl = document.getElementById('transferMessage');
    const submitTransferBtn = document.getElementById('submitTransferBtn'); // 获取提交按钮，用于控制禁用状态

    if (!scoreManagementBtn || !transferScoreModal || !closeTransferModalBtn || !transferScoreForm || !transferMessageEl || !submitTransferBtn /* || !其他关键元素 */ ) {
        console.error("Portal_App.js: One or more UI elements for score management or index page not found.");
        // return; // 可以选择在这里中止，或者让后续逻辑处理null情况
    }

    // ... (根据token状态显示/隐藏导航按钮的逻辑，与上一版一致，确保 scoreManagementBtn 也被正确处理)
    // 例如，在 token 存在的逻辑块中:
    // loginLinkEl.style.display = 'none';
    // registerLinkEl.style.display = 'none';
    // manageLinkEl.style.display = 'none'; // 如果之前有 manageLink，现在隐藏它
    // scoreManagementBtn.style.display = 'inline-block'; // 显示积分管理按钮
    // logoutButtonEl.style.display = 'block';

    // --- 积分管理模态框事件处理 ---
    if (scoreManagementBtn && transferScoreModal && closeTransferModalBtn && transferScoreForm) {
        scoreManagementBtn.addEventListener('click', () => {
            console.log("Portal_App.js: Score Management button clicked.");
            transferScoreModal.style.display = 'block';
            transferMessageEl.style.display = 'none'; // 重置消息
            transferMessageEl.textContent = '';
            transferScoreForm.reset(); // 重置表单
        });

        closeTransferModalBtn.addEventListener('click', () => {
            transferScoreModal.style.display = 'none';
        });

        // 点击模态框外部区域关闭 (可选)
        window.addEventListener('click', (event) => {
            if (event.target == transferScoreModal) {
                transferScoreModal.style.display = 'none';
            }
        });

        transferScoreForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            console.log("Portal_App.js: Transfer score form submitted.");
            transferMessageEl.style.display = 'none';
            transferMessageEl.className = 'message'; // 重置class
            submitTransferBtn.disabled = true; // 禁用按钮防止重复提交
            submitTransferBtn.textContent = '处理中...';

            const gameType = document.getElementById('transferGameType').value;
            const amount = document.getElementById('transferAmount').value;
            const recipientPhone = document.getElementById('recipientPhone').value;

            if (parseInt(amount, 10) <= 0) {
                transferMessageEl.textContent = '赠送数量必须大于0。';
                transferMessageEl.classList.add('error');
                transferMessageEl.style.display = 'block';
                submitTransferBtn.disabled = false;
                submitTransferBtn.textContent = '确认赠送';
                return;
            }

            try {
                const result = await transferScore(gameType, amount, recipientPhone);
                console.log("Portal_App.js: transferScore API response:", result);
                if (result && result.success) {
                    transferMessageEl.textContent = result.message || '积分赠送成功！';
                    transferMessageEl.classList.add('success');
                    // 赠送成功后，刷新当前用户信息和积分 (重要)
                    await initIndexPage(); // 重新加载首页数据
                    // transferScoreForm.reset(); // 也可以在这里重置表单
                    setTimeout(() => { // 延迟关闭模态框，让用户看到成功消息
                         if (transferScoreModal.style.display === 'block') { // 避免在重新加载initIndexPage后，模态框可能已被隐藏而报错
                            transferScoreModal.style.display = 'none';
                         }
                    }, 2500);
                } else {
                    transferMessageEl.textContent = (result && result.message) ? result.message : '积分赠送失败，请稍后再试。';
                    transferMessageEl.classList.add('error');
                }
            } catch (error) {
                transferMessageEl.textContent = (error && error.message) ? error.message : '赠送过程中发生网络或未知错误。';
                transferMessageEl.classList.add('error');
                console.error("Portal_App.js: Error during score transfer:", error);
            } finally {
                transferMessageEl.style.display = 'block';
                submitTransferBtn.disabled = false;
                submitTransferBtn.textContent = '确认赠送';
            }
        });
    } else {
        console.warn("Portal_App.js: Score management modal elements not fully found.");
    }


    // ... (try...catch 块调用 getUserProfile 并填充 userInfoEl, scoresEl, gameLinksEl 的逻辑，与上一版一致) ...
    // 确保在获取 token 后，正确控制 scoreManagementBtn 的显示:
    // if (!token) { ... scoreManagementBtn.style.display = 'none'; ... }
    // else { ... scoreManagementBtn.style.display = 'inline-block'; ... }
}

// 确保你已从之前的版本复制了 initRegisterPage 和 initLoginPage 的完整函数定义
// function initRegisterPage() { /* ... */ }
// function initLoginPage() { /* ... */ }
