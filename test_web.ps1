# 测试网站访问
try {
    $response = Invoke-WebRequest -Uri "https://fireseed.online" -UseBasicParsing
    Write-Host "网站状态码:" $response.StatusCode -ForegroundColor Green
    Write-Host "网站标题:" $response.ParsedHtml.title -ForegroundColor Green
} catch {
    Write-Host "网站访问失败:" $_.Exception.Message -ForegroundColor Red
}