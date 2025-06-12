<?php
// 入口，用于支持路由转发到 /api/*
if (strpos($_SERVER['REQUEST_URI'], '/api/') === 0) {
  $file = __DIR__ . $_SERVER['REQUEST_URI'];
  if (file_exists($file)) {
    require $file;
    exit;
  }
  http_response_code(404); echo 'Not Found'; exit;
}
echo "十三水 PHP 后端运行中";
