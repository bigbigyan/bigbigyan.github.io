---
layout: post
title: Install PX4 ROS2 QGC
author: Yan Zhou
date: 2022-10-18 18:20 +0800
last_modified_at: 2022-11-2 12:00:00 +0800
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

7. PX4 version management
	- check current version
	```
	cd PX4/PX4-Autopilot/
	git describe --always --tags
	```

	- change version - method 1
	firstly, download the source code 
	```
	git clone https://github.com/PX4/PX4-Autopilot.git --recursive
	```
	then change the version
	```
	git tag                    #view avaliable versions, press 'Q' quit
	git checkout v1.13.1       #change the version to v1.13.1
	make list_config_targets   #view avaliable firmware
	make px4_sitl_rtps gazebo  #compile the code
	```
	if you want to select another version
	```
	git checkout v1.13.0
	git submodule sync --recursive
	git submodule update --init --recursive  #update the submodule under the corresponding version
	make px4_sitl_rtps gazebo  #compile the code 
	```

	- change version - method 2
	dowmload PX4 source with corresponding version
	```
	git clone -b v1.13.1 https://github.com/PX4/PX4-Autopilot.git --recursive
	cd PX4-Autopilot
	git submodule update --init --rescursive
	```
	Reference:<https://blog.csdn.net/XL__MAX/article/details/105912208>

## Install ROS2

### Install Fast DDS

1. Check the version of java JDK 11:
	```
	java --version

		openjdk 13.0.7 2021-04-20
		OpenJDK Runtime Environment (build 13.0.7+5-Ubuntu-0ubuntu120.04)
		OpenJDK 64-Bit Server VM (build 13.0.7+5-Ubuntu-0ubuntu120.04, mixed mode, sharing)
	```

2. Install Foonathan Memory dependency:
	```
	git clone https://github.com/eProsima/foonathan_memory_vendor.git
	cd foonathan_memory_vendor
	mkdir build && cd build
	cmake ..
	sudo cmake --build . --target install
	```

3. Install from source code:
* Fast DDS
	1. Clone the project from Github:
	```
	git clone --recursive https://github.com/eProsima/Fast-DDS.git -b v2.0.2 
	cd FastDDS-2.0.2
	mkdir build && cd build
	```
	2. If you are on Linux, execute:
	```
	cmake -DTHIRDPARTY=ON -DSECURITY=ON ..
	make -j$(nproc --all)
	sudo make install
	```
	This will install Fast DDS to `/usr/local`, with secure communications support. If you need to install to a custom location you can use: `-DCMAKE_INSTALL_PREFIX=<path>.`
	3. Compile Options, The following additional arguments can be used when calling CMake:
	```
    	-DCOMPILE_EXAMPLES=ON: Compile the examples
    	-DPERFORMANCE_TESTS=ON: Compile the performance tests
	```

	* Fast-RTPS-Gen
	`Fast-RTPS-Gen` is the Fast RTPS (DDS) IDL code generator tool. It should be installed after Fast RTPS (DDS) and made sure the `fastrtpsgen` application is in your `PATH`. You can check with `which fastrtpsgen`.
	> `which fastrtpsgen` will have output until you finish the install of `Fast-RTPS-Gen`.

	1. Then clone Fast-RTPS-Gen 1\.0\.4:
	```
	git clone --recursive https://github.com/eProsima/Fast-DDS-Gen.git -b v1.0.4
	cd ~/Fast-DDS-Gen/gradle/wrapper
	```

	2. After that, modify the distribution version of gradle inside the gradle-wrapper.properties file to gradle-6.8.3 such that the distributionUrl file becomes as follows:
	```
	distributionUrl=https\://services.gradle.org/distributions/gradle-6.8.3-bin.zip
	```
	> modify the `gradle-wrapper.properties` file , not run it on the terminal.

	3. Now you should run the following commands:
	```
    	cd ~/Fast-RTPS-Gen 
    	./gradlew assemble && sudo env "PATH=$PATH" ./gradlew install
	```
	> the `PATH=$PATH` should not be mofify, otherwise :
	> ```
	> usr/bin/env: ‘sh’: No such file or directory gradle
	> ```

Reference: <https://docs.px4.io/main/en/dev_setup/fast-dds-installation.html>

### Install ROS2
1. Download tha key
	```
	sudo curl -sSL https://raw.githubusercontent.com/ros/rosdistro/master/ros.key  -o /usr/share/keyrings/ros-archive-keyring.gpg
	```
2. Export to system
	```
	echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/ros-archive-keyring.gpg] https://mirrors.tuna.tsinghua.edu.cn/ros2/ubuntu/ $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/ros2.list > /dev/null
	```
3. Install ROS2
	```
	sudo apt update
	sudo apt install ros-foxy-desktop
	```
4. The install process should also install the `colcon` build tools, but in case that doesn't happen, you can install the tools manually:
	```
	sudo apt install python3-colcon-common-extensions
	```
5. `eigen3_cmake_module` is also required, since Eigen3 is used on the transforms library:
	```
	sudo apt install ros-foxy-eigen3-cmake-module
	```
6. Some Python dependencies must also be installed (using `pip` or `apt`):
	```
	sudo pip3 install -U empy pyros-genmsg setuptools
	```
	> ```
	> ERROR: launchpadlib 1.10.13 requires testresources, which is not installed.
	> ```
	you can solve this by:
	> ```
	> sudo apt install python3-testresources
	> ```
	> Reference: <https://gist.github.com/y56/0540d22a1db40dacc7fbbb93c866821e>
7. Configure environment variables.
	```sh
	echo "source /opt/ros/foxy/setup.bash" >> ~/.bashrc
	```

Reference: <https://zhuanlan.zhihu.com/p/430670234>  
Reference: <https://docs.px4.io/main/en/ros/ros2_comm.html>

## Install 	QGC

1. On the command prompt enter:
	```
	sudo usermod -a -G dialout $USER  #sudo usermod -a -G dialout zy
	sudo apt-get remove modemmanager -y
	sudo apt install gstreamer1.0-plugins-bad gstreamer1.0-libav gstreamer1.0-gl -y
	sudo apt install libqt5gui5 -y
	sudo apt install libfuse2 -y
	```
	Reference: <https://blog.csdn.net/qq_40342287/article/details/105939584>
2. Check out the user if changed:
	```
	grep 'dialout' /etc/group
	dialout:x:20:zy
	```
3. Download [QGroundControl.AppImage](https://d176tv9ibo4jno.cloudfront.net/latest/QGroundControl.AppImage).
4. Install QGC using the terminal commands:
	```
	chmod +x ./QGroundControl.AppImage
	```
5. Run QGC:
	```
	./QGroundControl.AppImage  (or double click)
	```

Reference: <https://docs.qgroundcontrol.com/master/en/getting_started/download_and_install.html>