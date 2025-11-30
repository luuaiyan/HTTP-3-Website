/*
 * HTTP/3 Adventure - Global JavaScript
 * 文件路径: /assets/js/main.js
 * 包含导航菜单逻辑、页面协议检测和基于后端 API 的 HTTP/3 验证工具。
 */

// ==========================================================
// 1. 导航菜单切换逻辑
// ==========================================================
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });
    
    navLinks.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('open')) {
                navLinks.classList.remove('open');
            }
        });
    });
}


// ==========================================================
// 2. 网站协议检测逻辑 (页面底部状态栏) - 优化版
// ==========================================================
window.addEventListener('load', () => {
    const statusText = document.getElementById('protocol-status');
    if (statusText) {
        let detectedProtocol = 'Ready for HTTP/3'; // 默认值

        try {
            const navEntry = performance.getEntriesByType("navigation")[0];
            
            if (navEntry && navEntry.nextHopProtocol) {
                let protocol = navEntry.nextHopProtocol.toLowerCase();
                
                if (protocol === 'h3') { 
                    detectedProtocol = "Connected via HTTP/3"; 
                } else if (protocol === 'h2') { 
                    detectedProtocol = "Connected via HTTP/2"; 
                } else if (protocol.startsWith('http/1')) { 
                    // 明确检测 HTTP/1.x
                    detectedProtocol = "Connected via HTTP/1.x"; 
                } else {
                    // 显示其他未知协议
                    detectedProtocol = `Protocol: ${protocol}`;
                }
            } else { 
                // 如果 navEntry 或 nextHopProtocol 不可用 (例如，CORS限制，本地文件，或极老的浏览器)
                detectedProtocol = "Protocol Status Unknown"; 
            }
        } catch (e) {
            // 捕获权限或其他错误
            detectedProtocol = "Protocol Check Failed";
        }
        
        // 最终更新状态栏文本
        statusText.innerText = detectedProtocol;
    }
});

