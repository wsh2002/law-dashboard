@echo off
chcp 65001
echo ========================================================
echo 正在配置网络权限...
echo ========================================================

:: 尝试添加防火墙规则 (需要管理员权限，如果失败会提示)
netsh advfirewall firewall delete rule name="Law Dashboard Node" >nul 2>&1
netsh advfirewall firewall add rule name="Law Dashboard Node" dir=in action=allow protocol=TCP localport=5173

echo.
echo ========================================================
echo ✅ 服务已启动!
echo.
echo 您的局域网访问地址是:
echo http://192.168.2.24:5173/
echo.
echo 请将上面的链接发送给同事。
echo ⚠️  注意: 必须保持此黑色窗口开启，别人才能访问。
echo ========================================================
echo.

:: 启动服务
npm run dev
pause
