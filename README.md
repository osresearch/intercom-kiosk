Pi dashboards
====

Reolink camera FLV video stream adapter.

Pi startup scripts are in `/etc/xdg/lxsession/LXDE-pi/autostart`

Remove unused daemons:
```
export LC_ALL=C
sudo apt remove -y cups cups-daemon modemmanager colord triggerhappy
sudo apt install -y firefox-esr xdotool
sudo apt autoremove -y
sudo systemctl disable packagekit.service
```

Setup startup scripts and configure X:
```
sudo perl -pi -e 's/#xserver-command=X/xserver-command=X -nocursor/' /etc/lightdm/lightdm.conf
if ! grep -q disable-bt /boot/config.txt ; then echo dtoverlay=disable-bt | sudo tee -a /boot/config.txt ; fi
sudo tee <<EOF /etc/xdg/lxsession/LXDE-pi/autostart
@xset s off
@xset -dpms
@xset -s noblank
@firefox-esr --kiosk  --disable-pinch --remote-debugging-port=9222 http://kremvax:9999/html/index.html#office
EOF
```


```
00000000:
46 4c 56 FLV
01 version 1
00 flags == 0
00 00 00 09 header size = 9

00 00 00 00	previous packet == 0 bytes (first packet)
12		type == 0x12 == 18 == "AMF Metadata"
00 00 d0	uint24_t payload size
00 00 00 00	uint32_t timestamp
00 00 00	uint24_t stream id == 0

02 00 0a 6f 6e 4d 65 74  ...........onMet
00000020: 61 44 61 74 61 03 00 05 77 69 64 74 68 00 40 a4  aData...width.@.
00000030: 00 00 00 00 00 00 00 06 68 65 69 67 68 74 00 40  ........height.@
00000040: 9e 00 00 00 00 00 00 00 0c 64 69 73 70 6c 61 79  .........display
00000050: 57 69 64 74 68 00 40 a4 00 00 00 00 00 00 00 0d  Width.@.........
00000060: 64 69 73 70 6c 61 79 48 65 69 67 68 74 00 40 9e  displayHeight.@.
00000070: 00 00 00 00 00 00 00 08 64 75 72 61 74 69 6f 6e  ........duration
00000080: 00 00 00 00 00 00 00 00 00 00 0c 76 69 64 65 6f  ...........video
00000090: 63 6f 64 65 63 69 64 00 40 1c 00 00 00 00 00 00  codecid.@.......
000000a0: 00 0c 61 75 64 69 6f 63 6f 64 65 63 69 64 00 40  ..audiocodecid.@
000000b0: 24 00 00 00 00 00 00 00 0f 61 75 64 69 6f 73 61  $........audiosa
000000c0: 6d 70 6c 65 72 61 74 65 00 40 cf 40 00 00 00 00  mplerate.@.@....
000000d0: 00 00 09 66 72 61 6d 65 72 61 74 65 00 40 33 00  ...framerate.@3.
000000e0: 00 00 00 00 00 00 00 09 00 00 00 db 09 00 00 20  ............... 
000000f0: 00 00 00 00 00 00 00 17 00 00 00 00 01 64 00 33  .............d.3
00000100: ff e1 00 0c 67 64 00 33 ac 15 14 a0 28 00 f1 90  ....gd.3....(...
00000110: 01 00 04 68 ee 3c b0 00 00 00 2b 09 05 32 80 00  ...h.<....+..2..
00000120: 00 00 00 00 00 00 17 01 00 00 00 00 05 32 77 65  .............2we
00000130: 88 80 01 00 00 27 f6 fd 4a 4e 6c a0 bb 63 ca 1a  .....'..JNl..c..
```

## ffmpeg

To stream via nginx via HLS, which unfortunately adds 30 seconds of latency:
```
ffmpeg -i 'https://10.1.0.175/flv?port=1935&app=bcs&stream=channel0_main.bcs&user=user&password=viewer' -c:a copy -c:v h264 -vf scale=800x480 -f flv rtmp://localhost/live/frontdoor
```

To stream via FLV, which only supports one client and exits when the client exits:
```
```

## Backlight

backlight for HDMI connected displays:
```
ddcutil setvcp 10 0
```

backlight for DPI connected displays:
```
echo 0 | sudo tee /sys/class/backlight/something
```

## buildroot

using stable version 2023.11

this patch is required https://patchwork.ozlabs.org/project/buildroot/patch/20231025205233.1925727-1-kadir.c.yilmaz@gmail.com/

this is broken https://www.mail-archive.com/debian-qt-kde@lists.debian.org/msg107425.html
the patch to add iterator fixes it ? https://www.mail-archive.com/debian-bugs-dist@lists.debian.org/msg1900409.html

reducing the number of parallel jobs prevents machine death
due to too many `jumbo_X.cxx` files being compiled simultaneously.

`setup_signal_handlers` isn't declared?  https://wiki.linuxfromscratch.org/blfs/ticket/16377

qssl https://lists.buildroot.org/pipermail/buildroot/2022-February/637580.html

rolling back to longeterm 2023.02.8

almost aeverything works, except wekbit kiosk
h -Fla !tps://lists.buildroot.org/pipermail/buildroot/2022-June/644924.html

must patch *before* building, otherwise it won't be re-applied

