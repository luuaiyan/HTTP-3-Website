
// ==========================================================
//      HTTP/3 探测工具逻辑 (调用后端 API) - 最终优化版本
// ==========================================================

const targetUrlInput = document.getElementById('targetUrl');
const checkButton = document.getElementById('checkButton');
const checkResultBox = document.getElementById('checkResult'); 
const resultStatus = checkResultBox ? checkResultBox.querySelector('.result-status') : null;
const resultDetails = checkResultBox ? checkResultBox.querySelector('.result-details') : null;
const protocolStatusBadge = document.getElementById('protocol-status'); 

if (targetUrlInput && checkButton && checkResultBox) {

    const validateAndEnableButton = () => {
        const url = targetUrlInput.value.trim();
        checkButton.disabled = (url.length <= 5);
    };

    const handleCheck = async () => {
        let url = targetUrlInput.value.trim();
        
        if (checkButton.disabled) return;

        // 自动添加 https:// 协议头
        if (!url.toLowerCase().startsWith('http://') && !url.toLowerCase().startsWith('https://')) {
            url = 'https://' + url;
        }

        // 清理旧状态并禁用按钮
        checkResultBox.className = 'result-box';
        resultStatus.innerText = '服务器正在检测...';
        resultDetails.style.display = 'block';
        resultDetails.innerHTML = '';
        checkButton.disabled = true;
        checkButton.textContent = '检测中...';
        if (protocolStatusBadge) protocolStatusBadge.textContent = '检测中...';


        try {
            const api_url = `/check-http3-api?url=${encodeURIComponent(url)}`;
            const response = await fetch(api_url);
            
            if (!response.ok) {
                throw new Error(`API 返回状态码: ${response.status}`);
            }
            
            const data = await response.json();
            const isSuccess = data.status === 'success';

            if (isSuccess) {
                checkResultBox.classList.add('success');
                resultStatus.innerText = `✅ ${data.protocol} 连接验证成功！`;
            } else {
                checkResultBox.classList.add('fail');
                resultStatus.innerText = `❌ ${data.message}`; 
            }
            
            // RTT 视觉增强
            let rttDisplay = '';
            if (isSuccess && data.rtt_status) {
                let statusText = data.rtt_status;
                let icon = '';

                if (statusText.includes('0-RTT')) {
                    icon = '🚀'; 
                } else if (statusText.includes('1-RTT') || statusText.includes('握手成功')) {
                    icon = '⚡'; 
                } else if (statusText.includes('N/A')) {
                    icon = '❔'; 
                }
                
                rttDisplay = `<strong>握手延迟:</strong> <span style="font-weight: 700;">${icon} ${statusText}</span>`;
            }
            
            // ----------------------------------------------------
            // **日志内容格式化和高亮逻辑**
            // ----------------------------------------------------
            
            // 1. 清理并分割行 (去除空行)
            const lines = data.details.split('\n').map(line => line.trim()).filter(line => line !== '');
            
            // 2. 处理每行：突出显示键名
            const formattedLines = lines.map(line => {
                const colonIndex = line.indexOf(':');
                
                // 设置高亮样式
                const keyStyle = "font-weight: bold; color: var(--accent-primary); font-family: 'Arial', sans-serif;";
                
                // --- 排除和特殊格式化规则 ---
                
                // 1. 排除协议请求行、内部帧信息
                if (line.startsWith('[HTTP/3]') || line.match(/^(GET|HEAD|POST|PUT|DELETE)\s/)) {
                    return line; // 保持原始格式
                }
                
                // 2. SSL/连接状态行 (整行加粗)
                if (line.startsWith('SSL') || line.startsWith('Established') || line.startsWith('using HTTP/3') || line.startsWith('Host')) {
                    return `<span style="${keyStyle} font-size: 1em;">${line}</span>`; 
                }

                // --- 键值对高亮规则 ---
                if (colonIndex !== -1 && colonIndex < line.length - 1) {
                    const key = line.substring(0, colonIndex + 1); // 包括冒号
                    const value = line.substring(colonIndex + 1).trim();
                    
                    // 仅对 HTTP 头部、证书属性等明确的键值对进行高亮
                    if (key.match(/host|server|date|content-type|issuer|subject|level|etag|range/i)) {
                         return `<span style="${keyStyle}">${key}</span> ${value}`;
                    }
                }
                
                // 3. 默认突出规则 (针对 IP 解析等信息)
                if (line.includes('IP') || line.includes('Trust Anchors') || line.includes('Certificate level')) {
                    return `<span style="${keyStyle} font-size: 1em;">${line}</span>`;
                }

                return line; // 保持其他行原样
            });
            
            // 3. 重新连接，并进行全局清理
            const cleanedDetails = formattedLines.join('\n').trim(); 
            
            // 4. 渲染结果
            resultDetails.style.display = 'block';
            resultDetails.innerHTML = '<div style="margin-bottom: 0.5rem; display: flex; justify-content: space-between;">' +
                '<span><strong>协议状态:</strong> ' + data.message + '</span>' +
                (rttDisplay ? '<span>' + rttDisplay + '</span>' : '') +
            '</div>' +
            '<hr style="margin: 10px 0; border-color: rgba(255,255,255,0.1);">' +
            '<strong>服务器响应:</strong>' +
            '<div class="log-output" style="' +
                // ******** 最终修正：强制不换行，启用水平滚动条 ********
                'white-space: pre; ' +  // 强制不自动换行
                'overflow-x: auto; ' +
                'margin-top: 5px; ' +
                'padding: 0.5rem; ' +  
                'text-indent: 0; ' +  
                'font-size: 0.9rem; ' +
                'color: ' + (isSuccess ? 'var(--code-success)' : 'var(--code-fail)') + '; ' +
                'font-family: \'Fira Code\', monospace; ' + 
            '">' +
                cleanedDetails +
            '</div>';

            if (protocolStatusBadge) protocolStatusBadge.textContent = '检测完成';


        } catch (error) {
            checkResultBox.classList.add('fail');
            resultStatus.innerText = '⚠️ API 通信错误';
            resultDetails.style.display = 'block';
            
            // 错误详情不需要滚动，但需要换行
            resultDetails.innerHTML = '<div style="margin-bottom: 0.5rem;"><strong>错误详情:</strong></div>' +
            '<div style="white-space: pre-wrap; font-size: 0.9rem;">' +
                error.message +
            '</div>';

            if (protocolStatusBadge) protocolStatusBadge.textContent = '错误';
            
        } finally {
            checkButton.textContent = '开始检测';
            validateAndEnableButton(); 
        }
    };
    
    // 监听输入，实时启用/禁用按钮
    targetUrlInput.addEventListener('input', validateAndEnableButton);
    
    // 回车键监听
    targetUrlInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !checkButton.disabled) {
            event.preventDefault(); 
            handleCheck();
        }
    });

    // 监听点击事件
    checkButton.addEventListener('click', handleCheck);
    
    // 初始化时检查一次
    validateAndEnableButton();
}