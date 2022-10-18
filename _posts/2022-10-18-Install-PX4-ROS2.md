---
layout: post
title: Install PX4 ROS2
author: Yan Zhou
date: 2022-10-18 18:20 +0800
last_modified_at: 2022-10-18 23:32:00 +0800
tags: [PX4, ROS2]
toc:  true
---

## Install PX4

1. Download PX4 source code:
```
git clone https://github.com/PX4/PX4-Autopilot.git --recursive
```

2. Run the `ubuntu.sh` with no arguments (in a bash shell) to install everything:
```
bash ./PX4-Autopilot/Tools/setup/ubuntu.sh
```
Reference: <https://docs.px4.io/main/en/dev_setup/dev_env_linux_ubuntu.html>

3. Installing PX4 Python3 dependencies failed, modify the corresponding code in `ubuntu.sh`
```
echo
echo "Installing PX4 Python3 dependencies"
if [ -n "$VIRTUAL_ENV" ]; then
	# virtual environments don't allow --user option
	python -m pip install -r ${DIR}/requirements.txt
else
	# older versions of Ubuntu require --user option
	python3 -m pip install --user -r ${DIR}/requirements.txt
fi
```
to
```
# Python3 dependencies
echo
echo "Installing PX4 Python3 dependencies"
if [ -n "$VIRTUAL_ENV" ]; then
	# virtual environments don't allow --user option
	python -m pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r ${DIR}/requirements.txt
else
	# older versions of Ubuntu require --user option
	python3 -m pip install --user -i https://pypi.tuna.tsinghua.edu.cn/simple -r ${DIR}/requirements.txt
fi
```
Reference:<https://blog.csdn.net/bruceliwlm/article/details/115247901?spm=1001.2014.3001.5502>

4. Connecting time out
```
Connecting to packages.osrfoundation.org (packages.osrfoundation.org)|52.52.171.73|:80... failed: Connection timed out.
```
find corresponding code and copy, then compile it in the terminal:
```
wget http://packages.osrfoundation.org/gazebo.key -O - | sudo apt-key add -
```

5. When the script `ubuntu.sh` gets stuck, you can quit by `ctrl + c`, and then continue `bash ubuntu.sh`

6. Reboot the computer