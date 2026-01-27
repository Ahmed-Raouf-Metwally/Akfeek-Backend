# Fix Swagger Routes Script
# This script adds /api prefix to Swagger documentation in route files

$files = @(
    'd:\Akfeek\Akfeek-Backend\src\api\routes\users.routes.js',
    'd:\Akfeek\Akfeek-Backend\src\api\routes\services.routes.js',
    'd:\Akfeek\Akfeek-Backend\src\api\routes\models.routes.js',
    'd:\Akfeek\Akfeek-Backend\src\api\routes\brands.routes.js'
)

$patterns = @{
    'users.routes.js' = '(\*\s+)(/users)'
    'services.routes.js' = '(\*\s+)(/services)'  
    'models.routes.js' = '(\*\s+)(/models)'
    'brands.routes.js' = '(\*\s+)(/brands)'
}

foreach ($file in $files) {
    $filename = Split-Path $file -Leaf
    $pattern = $patterns[$filename]
    
    Write-Host "Processing $filename..." -ForegroundColor Cyan
    
    $content = Get-Content $file -Raw -Encoding UTF8
    $fixed = $content -replace $pattern, '$1/api$2'
    $fixed | Set-Content $file -NoNewline -Encoding UTF8
    
    Write-Host "✅ Fixed $filename" -ForegroundColor Green
}

Write-Host "`n✅ All route files fixed!" -ForegroundColor Green
Write-Host "Please restart the server (npm run dev) to see changes in Swagger." -ForegroundColor Yellow
