# 测试 API 端点
$uri = "https://fireseed.online/api/admin/novels"

try {
    $response = Invoke-RestMethod -Uri $uri -Method GET -ContentType "application/json"
    Write-Host "API 访问成功:" -ForegroundColor Green
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "API 访问失败:" -ForegroundColor Red
    Write-Host "状态码:" $_.Exception.Response.StatusCode.value__
    Write-Host "错误信息:" $_.Exception.Message
}