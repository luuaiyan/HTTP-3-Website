<?php
/**
 * HTTP/3 真实连接验证后端 API
 * 文件路径: /var/www/http3/check.php
 */

header('Content-Type: application/json');

// ----------------------------------------------------
// 路径定义：使用第一步部署的新路径
// ----------------------------------------------------
$curl_path = '/var/www/http3-curl/bin/curl';
$lib_path = '/var/www/http3-curl/lib';

$url = isset($_GET['url']) ? trim($_GET['url']) : '';

if (empty($url) || !preg_match('/^https:\/\//i', $url)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'URL无效，必须以 https:// 开头。']);
    exit;
}

// 权限和可执行性检查
if (!is_executable($curl_path)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => '服务器错误：cURL 工具无法执行。请检查文件权限和用户所有权。']);
    exit;
}

// ----------------------------------------------------
// 核心逻辑：设置环境变量并执行 cURL 命令
// ----------------------------------------------------

// 关键修改：添加 -v (verbose) 参数，以便获取握手信息
$cmd = "LD_LIBRARY_PATH=" . escapeshellarg($lib_path) . " " .
escapeshellarg($curl_path) . " -I --http3 -v " . escapeshellarg($url) . " 2>&1";

$output = shell_exec($cmd);

// ----------------------------------------------------
// 解析 cURL 输出
// ----------------------------------------------------

$is_http3_success = false;
$response_status_message = '未知';
$raw_headers = '';
$rtt_status = 'N/A'; // 新增 RTT 状态变量

// 1. 提取 RTT 状态 (通过解析 -v 输出中的握手信息)
if (strpos($output, '* Using HTTP/3') !== false) {
    // cURL 的 -v 输出中，如果是 0-RTT，会明确提示，或根据连接复用判断
    if (strpos($output, '* Connection state: 0-RTT') !== false || strpos($output, 'QUIC stream connection: 0-RTT') !== false) {
        $rtt_status = '0-RTT (会话恢复)';
    } elseif (strpos($output, '* Handshake complete') !== false || strpos($output, 'QUIC stream connection: 1-RTT') !== false) {
        // 如果是首次连接，或者没有明确提示 0-RTT
        $rtt_status = '1-RTT (首次握手)';
    } else {
        $rtt_status = 'QUIC 握手成功';
    }
}

// 2. 判断协议和状态码
if (preg_match('/< HTTP\/3 (\d{3})/', $output, $matches_h3)) {
    $is_http3_success = true;
    $response_status_message = 'HTTP/3 (QUIC) 连接成功';
    $http_status_code = $matches_h3[1];

} elseif (preg_match('/< HTTP\/\d.\d\s+(\d{3})/', $output, $matches)) {
    // 捕获回退协议
    $is_http3_success = false;
    $http_status_code = $matches[1];
    $response_status_message = "连接成功，但回退到 TCP 协议 (H3 尝试失败)";

} else {
    $is_http3_success = false;
    $response_status_message = '连接失败或 QUIC 握手错误 (请检查 UDP 443)';
    $http_status_code = '???';
}


// 3. 提取用户可见的头部/Verbose 信息
// 提取从第一个 * 或 < 开始的所有信息，直到脚本末尾
$header_start = strpos($output, '* ');
if ($header_start === false) {
    $header_start = strpos($output, '< ');
}

if ($header_start !== false) {
    // 过滤掉 cURL 进程信息，只保留连接和 HTTP 交互信息
    $raw_output_lines = explode("\n", substr($output, $header_start));
    $filtered_output = [];

    foreach ($raw_output_lines as $line) {
        // 保留 QUIC/TLS/HTTP/ALPN 相关的行，并去除前导符号、空格和续行反斜杠
        if (trim($line) === '') continue;
        if (strpos($line, '* ') === 0 || strpos($line, '< ') === 0 || strpos($line, '> ') === 0) {
            $clean_line = trim(substr($line, 2)); // 去除符号和首尾空格
            $clean_line = str_replace('\\', '', $clean_line); // 去除续行反斜杠
            $filtered_output[] = $clean_line;
        }
    }
    $raw_headers = implode("\n", $filtered_output);

} else {
    $raw_headers = trim($output);
}

// ----------------------------------------------------
// 组织最终响应数据
// ----------------------------------------------------
$response_data = [
    'status' => $is_http3_success ? 'success' : 'failure',
'protocol' => $is_http3_success ? 'HTTP/3' : 'Failed',
'message' => $response_status_message,
'rtt_status' => $rtt_status, // <-- 新增 RTT 参数
'details' => $raw_headers,
];

echo json_encode($response_data);

?>
