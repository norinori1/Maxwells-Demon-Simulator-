# Maxwell's Demon Simulator - サウンドファイル配置スクリプト
# このスクリプトをダブルクリックで実行してください（右クリック→PowerShellで実行）

$downloadsDir = "$env:USERPROFILE\Downloads"
$soundsDir    = "$PSScriptRoot\public\sounds"

# ---- SE ファイル (効果音ラボ .mp3) ----
$seFiles = @(
    @{ src = "se_valve_open.mp3";  dst = "se_valve_open.mp3"  },
    @{ src = "se_valve_close.mp3"; dst = "se_valve_close.mp3" },
    @{ src = "se_ball_pass.mp3";   dst = "se_ball_pass.mp3"   },
    @{ src = "se_warning.mp3";     dst = "se_warning.mp3"     }
)

# ---- BGM ファイル (MAOU音楽工房 .ogg) ----
$bgmFiles = @(
    @{ src = "maou_loop_bgm_cyber39.ogg"; dst = "bgm_game.ogg"   },
    @{ src = "maou_loop_bgm_cyber44.ogg"; dst = "bgm_result.ogg" }
)

$allFiles = $seFiles + $bgmFiles
$ok  = 0
$err = 0

foreach ($f in $allFiles) {
    $srcPath = Join-Path $downloadsDir $f.src
    $dstPath = Join-Path $soundsDir    $f.dst

    if (Test-Path $srcPath) {
        Copy-Item -Path $srcPath -Destination $dstPath -Force
        Write-Host "OK  $($f.src) -> public\sounds\$($f.dst)" -ForegroundColor Green
        $ok++
    } else {
        Write-Host "NOT FOUND: $srcPath" -ForegroundColor Yellow
        $err++
    }
}

Write-Host ""
Write-Host "完了: $ok ファイル配置, $err 件見つからず" -ForegroundColor Cyan

if ($err -gt 0) {
    Write-Host "見つからないファイルはダウンロードフォルダ ($downloadsDir) を確認してください" -ForegroundColor Yellow
}

Read-Host "Enterで終了"
