---
layout: post
title: Combine asv_wave_sim and ship
author: Yan Zhou
date: 2025-05-05 22:44 +0800
last_modified_at: 2025-05-06 12:00:00 +0800
tags: [asv_wave_sim, ardupilot, ardupilot_SITL]
toc:  true
---

## Install asv_wave_sim, ardupilot, ardupilot_gazebo, ardupilot_SITL

1. install gazebo garden
	<https://gazebosim.org/docs/garden/install/>
	如果图标打开是黑色的：
	<https://blog.csdn.net/raw_inputhello/article/details/132302448>

2. install and config asv_wave_sim
	use ubuntu 2204 and gazebo garden
	<https://github.com/srmainwaring/asv_wave_sim>
	issue:
	<https://github.com/srmainwaring/asv_wave_sim/issues/179>

3. install ardupilot
	<https://ardupilot.org/dev/docs/where-to-get-the-code.html>
	<https://ardupilot.org/dev/docs/building-setup-linux.html>
	build SITL:
	```
		./waf configure --board sitl
		./waf copter
	```

4. install ardupilot_gazebo
	<https://ardupilot.org/dev/docs/sitl-with-gazebo.html>

5. install ardupilot_SITL (just download this file is ok)
	<https://github.com/ArduPilot/SITL_Models/blob/master/Gazebo/docs/BlueBoat.md>

## add path
	see in ```/home/zy/program/asv_wave_sim/src/setup.bash```
	```
	#!/bin/bash

	# add ardupilot
	export GZ_SIM_SYSTEM_PLUGIN_PATH=$HOME/program/ardupilot/ardupilot/gz_ws/src/ardupilot_gazebo/build:$GZ_SIM_SYSTEM_PLUGIN_PATH
	export GZ_SIM_RESOURCE_PATH=$HOME/program/ardupilot/ardupilot/gz_ws/src/ardupilot_gazebo/models:$HOME/program/ardupilot/ardupilot/gz_ws/src/ardupilot_gazebo/worlds:$GZ_SIM_RESOURCE_PATH
	export GZ_SIM_RESOURCE_PATH=$GZ_SIM_RESOURCE_PATH:\
	$HOME/program/ardupilot/ardupilot/SITL_Models/Gazebo/models:\
	$HOME/program/ardupilot/ardupilot/SITL_Models/Gazebo/worlds

	. ~/.profile

	# for future use - to support multiple Gazebo versions
	export GZ_VERSION=garden

	# not usually required as should default to localhost address
	export GZ_IP=127.0.0.1

	# ensure the model and world files are found
	export GZ_SIM_RESOURCE_PATH=\
	$GZ_SIM_RESOURCE_PATH:\
	$HOME/program/asv_wave_sim/src/asv_wave_sim/gz-waves-models/models:\
	$HOME/program/asv_wave_sim/src/asv_wave_sim/gz-waves-models/world_models:\
	$HOME/program/asv_wave_sim/src/asv_wave_sim/gz-waves-models/worlds

	# ensure the system plugins are found
	export GZ_SIM_SYSTEM_PLUGIN_PATH=\
	$GZ_SIM_SYSTEM_PLUGIN_PATH:\
	$HOME/program/asv_wave_sim/src/install/lib

	# ensure the gui plugin is found
	export GZ_GUI_PLUGIN_PATH=\
	$GZ_GUI_PLUGIN_PATH:\
	$HOME/program/asv_wave_sim/src/asv_wave_sim/gz-waves/src/gui/plugins/waves_control/build

	# export IGN_GAZEBO_SYSTEM_PLUGIN_PATH=/usr/lib/x86_64-linux-gnu:$IGN_GAZEBO_SYSTEM_PLUGIN_PATH

	echo "Environment variables set for Gazebo."
	```

## Run this code
	```
	一个终端：
	zy@zy:~/program/asv_wave_sim/src$
	source ./install/setup.bash
	source setup.bash

	gz sim -v4 -r waves_test.sdf

	另一个终端：
	source ./install/setup.bash
	source setup.bash

	sim_vehicle.py -v Rover -f rover-skid --model JSON  --console --map --custom-location='51.566151,-4.034345,10.0,-135'

	然后：使用代码控制PWM
	修改QGC中的参数SERVO1_FUNCTION 从 Throttleleft -> RCIN1
	SERVO3_FUNCTION 从 ThrottleRight -> RCIN3

	再一个终端：（控制船运行）
	zy@zy:~/program/asv_wave_sim/control$ python3 control.py 

	最后一个终端：（采集数据）
	zy@zy:~/program/asv_wave_sim/recode$ python3 record.py 

	最后最后：退出记得修改QGC中的参数，否则下次运行船不能解锁
	SERVO1_FUNCTION 从 RCIN1 -> Throttleleft
	SERVO3_FUNCTION 从 RCIN1 -> ThrottleRight

	查看GPS数据
	gz topic -e -t /world/waves/model/blueboat/link/gps_link/sensor/gps_sensor/navsat
```
