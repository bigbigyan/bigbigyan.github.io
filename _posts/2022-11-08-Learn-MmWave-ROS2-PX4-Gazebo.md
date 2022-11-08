---
layout: post
title: Learn mmWave ROS2 PX4 Gazebo
author: Yan Zhou
date: 2022-11-08 20:00 +0800
last_modified_at: 2022-11-08 22:30:00 +0800
tags: [ROS2, PX4]
toc:  true
---

> This blog is a study recode.

> The source project is <https://github.com/nhma20/mmWave_ROS2_PX4_Gazebo.git>

## install.sh

This is a script file that is used to perform pre-simulation operations. This file is easy to understand.

Usage`./install.sh /path/to/PX4-Autopilot_root /path/to/px4_ros_com_ros2_root.`

The operations including
+ install cmake files
```sh
cp -f $CWD/cmake/CMakeLists.txt $PX4ROSDIR/src/px4_ros_com/
cp -f $CWD/cmake/sitl_target.cmake $PX4FIRMDIR/platforms/posix/cmake/
```
+ install gazebo model and worlds
```sh
cp -f -r $CWD/hca_models_and_worlds/models/* $PX4FIRMDIR/Tools/simulation/gazebo/sitl_gazebo/models/ -v
cp -f -r $CWD/hca_models_and_worlds/worlds/* $PX4FIRMDIR/Tools/simulation/gazebo/sitl_gazebo/worlds/ -v
cp -f -r $CWD/hca_models_and_worlds/new_iris/* $PX4FIRMDIR/Tools/simulation/gazebo/sitl_gazebo/models/iris/ -v
cp -f $CWD/cmake/sitl_targets_gazebo.cmake $PX4FIRMDIR/src/modules/simulation/simulator_mavlink/
```
+ install source files
```sh
cp -f $CWD/src/offboard_control.cpp $PX4ROSDIR/src/px4_ros_com/src/examples/offboard/
cp -f $CWD/src/vel_ctrl_vec_pub.cpp $PX4ROSDIR/src/px4_ros_com/src/examples/offboard/
cp -f $CWD/src/img_proj_depth.py $PX4ROSDIR/src/px4_ros_com/src/examples/offboard/
cp -f $CWD/src/img_3d_to_2d_proj.cpp $PX4ROSDIR/src/px4_ros_com/src/examples/offboard/
cp -f $CWD/src/lidar_to_mmwave.cpp $PX4ROSDIR/src/px4_ros_com/src/examples/offboard/
```
+ build ROS2 workspace
```sh
cd $PX4ROSDIR/src/px4_ros_com/scripts/
./build_ros2_workspace.bash
```

## CMakeLists.txt

> This file is in `/px4_ros_com_ros2/src/px4_ros_com/`

Here are some modified comparisons with the original file:
+ add `std_msgs` and `OpenCV (if is needed)` package
```
### original 
find_package(px4_msgs REQUIRED)
find_package(sensor_msgs REQUIRED)
find_package(geometry_msgs REQUIRED)
### new
find_package(px4_msgs REQUIRED)
find_package(sensor_msgs REQUIRED)
find_package(geometry_msgs REQUIRED)
find_package(std_msgs REQUIRED)
#find_package(OpenCV REQUIRED)
```
+ add target of `sensor_msgs` `std_msgs` `OpenCV`
```
### original
function(custom_executable subfolder target)
  add_executable(${target} src/${subfolder}/${target}.cpp)
  ament_target_dependencies(${target}
      rclcpp
      px4_msgs
  )
  install(TARGETS ${target}
  DESTINATION lib/${PROJECT_NAME})
endfunction()
### new
function(custom_executable subfolder target)
  add_executable(${target} src/${subfolder}/${target}.cpp)
  ament_target_dependencies(${target}
      rclcpp
      px4_msgs
      sensor_msgs
      std_msgs
      #OpenCV
  )
  install(TARGETS ${target}
  DESTINATION lib/${PROJECT_NAME})
endfunction()
```
+ add source files
```
### original
# Add examples
custom_executable(examples/listeners sensor_combined_listener)
custom_executable(examples/listeners vehicle_gps_position_listener)
custom_executable(examples/advertisers debug_vect_advertiser)
custom_executable(examples/offboard offboard_control)
### new
# Add examples
custom_executable(examples/listeners sensor_combined_listener)
custom_executable(examples/listeners vehicle_gps_position_listener)
custom_executable(examples/advertisers debug_vect_advertiser)
custom_executable(examples/offboard offboard_control)
custom_executable(examples/offboard vel_ctrl_vec_pub)
custom_executable(examples/offboard img_3d_to_2d_proj)
custom_executable(examples/offboard lidar_to_mmwave)
```

I have no idears of the usefulness of packages, targets, and sources in ROS2.


## sitl_target.cmake



## sitl_targets_gazebo.cmake

> This file is in `PX4-Autopilot/src/modules/simulation/simulator_mavlink/`

Here are some modified comparisons with the original file:
+ add models of `	grass_plane` `hca_plane` `Powerline_tempsetup` `powerpylons` `hca_temp_powerline` `hcaa_pylon_setup`
```cmake
### original
set(models
	none
	advanced_plane
	believer
	boat
	cloudship
	glider
	iris
	iris_dual_gps
	iris_foggy_lidar
	iris_irlock
	iris_obs_avoid
	iris_opt_flow
	iris_opt_flow_mockup
	iris_rplidar
	iris_vision
	nxp_cupcar
	omnicopter
	plane
	plane_cam
	plane_catapult
	plane_lidar
	px4vision
	r1_rover
	rover
	shell
	standard_vtol
	standard_vtol_drop
	tailsitter
	techpod
	tiltrotor
	typhoon_h480
	uuv_bluerov2_heavy
	uuv_hippocampus
)
### new
set(models
	none
	advanced_plane
	believer
	boat
	cloudship
	glider
	iris
	iris_dual_gps
	iris_foggy_lidar
	iris_irlock
	iris_obs_avoid
	iris_opt_flow
	iris_opt_flow_mockup
	iris_rplidar
	iris_vision
	nxp_cupcar
	omnicopter
	plane
	plane_cam
	plane_catapult
	plane_lidar
	px4vision
	r1_rover
	rover
	shell
	standard_vtol
	standard_vtol_drop
	tailsitter
	techpod
	tiltrotor
	typhoon_h480
	uuv_bluerov2_heavy
	uuv_hippocampus
	grass_plane
	hca_plane
	Powerline_tempsetup
	powerpylons
	hca_temp_powerline
	hcaa_pylon_setup
)
```
+ add worlds
```cmake
### original
set(worlds
	none
	baylands
	empty
	ksql_airport
	mcmillan_airfield
	sonoma_raceway
	warehouse
	windy
	yosemite
)
### new
set(worlds
	none
	baylands
	empty
	ksql_airport
	mcmillan_airfield
	sonoma_raceway
	warehouse
	windy
	yosemite
	d4e_airportsetup
	d4e_environment
	d4e_environment1
	d4e_env_orientation_test
	d4e_hca_airport
	d4e_HCAairport
	hca_full_pylon_setup
	hca_full_setup
)
```