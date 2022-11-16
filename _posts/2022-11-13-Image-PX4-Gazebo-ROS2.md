---
layout: post
title: Image PX4 Gazebo Ros2
author: Yan Zhou
date: 2022-11-13 20:00 +0800
last_modified_at: 2022-11-16 12:30:00 +0800
tags: [ROS2, PX4, Gazebo]
toc:  true
---

## Select PX4 version and configurate environment

1. Install gazebo_ros_pkgs (if you install before, you can pass this part)
      ```sh
      sudo apt install ros-foxy-gazebo-ros-pkgs
      ```
2. Install PX4 v1.13.1
      ```sh
      git clone -b v1.13.1 https://github.com/PX4/PX4-Autopilot.git
      ```

## Modify the iris.sdf.jinja

> This file is in `/PX4-Autopilot/Tools/sitl_gazebo/models/iris`  

+ Add camera sensor  
```
  <!-- SENSOR SECTION STARTS HERE --> 
  <!-- 2D Camera --> 
    <sensor type="camera" name="cable_camera">
      <pose>0.05 0 0.05 0 0 0</pose>
      <always_on>1</always_on>
      <update_rate>30</update_rate>
      <camera name="cable_camera">
        <horizontal_fov>1.3962634</horizontal_fov>
        <image>
          <width>480</width>
          <height>360</height>
          <format>R8G8B8</format>
        </image>         
        <clip>
          <near>0.02</near>
          <far>15000</far>
        </clip>
        <noise>
          <type>gaussian</type>
          <mean>0.0</mean>
          <stddev>0.007</stddev>
        </noise>
      </camera>
      <plugin name="plugin_name" filename="libgazebo_ros_camera.so">
        <ros>
          <argument>image_raw:=raw_img</argument>
          <argument>camera_info:=info</argument>
        </ros>
        <!-- Set camera name. If empty, defaults to sensor name (i.e. "sensor_name") -->
        <camera_name>cable_camera</camera_name>
        <!-- Set TF frame name. If empty, defaults to link name (i.e. "link_name") -->
        <!-- frame_name>cable_camera_frame</frame_name -->
        <!-- hack_baseline>0.07</hack_baseline -->
        <!-- No need to repeat distortion parameters or to set autoDistortion -->
      </plugin>
    </sensor>
  <!-- SENSOR SECTION ENDS HERE -->
```  
  Reference: <http://sdformat.org/spec>

+ Copy the `libgazebo_ros_camera.so`  
  Copy the `libgazebo_ros_camera.so` plugin from `/opt/ros/foxy/lib/` (after install ros-foxy-gazebo-ros-pkgs) to `../PX4-Autopilot/build/build_gazebo/` (after first make px4_sitl_rtps gazebo).


## Add worlds and models

  If you want to add yourself worlds or models, you can modify the `../PX4-Autopilot/platforms/posix/cmake/sitl_target.cmake`(v1.13.1 and older) and `../PX4-Autopilot/src/modules/simulation/simulator_mavlink/` (new version)  
  I donot know how to add a new model, so I just modify the iris model. Then I copy the `baylands.world` and rename `myself.world`, as my basis for modifying the world.
  ```
  set(models
	none
	believer
	boat
	cloudship
	glider
	if750a
	iris
	iris_ctrlalloc
	iris_dual_gps
	iris_foggy_lidar
	iris_irlock
	iris_obs_avoid
	iris_opt_flow
	iris_opt_flow_mockup
	iris_rplidar
	iris_vision
	nxp_cupcar
	plane
	plane_cam
	plane_catapult
	plane_lidar
	px4vision
	r1_rover
	rover
	shell
	solo
	standard_vtol
	standard_vtol_drop
	tailsitter
	techpod
	tiltrotor
	typhoon_h480
	typhoon_h480_ctrlalloc
	uuv_bluerov2_heavy
	uuv_hippocampus
  )

  set(worlds
	none
	baylands
	empty
	ksql_airport
	mcmillan_airfield
  myself
	sonoma_raceway
	warehouse
	windy
	yosemite
  )
  ```
  then clean and rebuild PX4:
  ```
  make clean
  make px4_sitl_rtps gazebo_iris__myself
  ```

  > If problem occured likes follow:
  > ```
  > -- Checking for module 'protobuf'
  > --   Found protobuf, version 3.6.1
  > -- Gazebo version: 11.11
  > -- Found GStreamer: adding gst_camera_plugin
  > -- Found GStreamer: adding gst_video_stream_widget
  > CMake Error at CMakeLists.txt:517 (install):
  >   install FILES given directory
  >   "/home/a/PX4/PX4-Autopilot/Tools/simulation/gazebo/sitl_gazebo/worlds/.vscode"
  >   to install.
  > -- Configuring incomplete, errors occurred!
  > See also "/home/a/PX4/PX4-Autopilot/build/px4_sitl_default/build_gazebo/CMakeFiles/CMakeOutput.log".
  > See also "/home/a/PX4/PX4-Autopilot/build/px4_sitl_default/build_gazebo/CMakeFiles/CMakeError.log".
  > [853/861] Building CXX object platform...iles/px4.dir/src/px4/common/main.cpp.o
  > FAILED: external/Stamp/sitl_gazebo/sitl_gazebo-configure 
  > cd /home/a/PX4/PX4-Autopilot/build/px4_sitl_default/build_gazebo && /usr/bin/cmake  -DCMAKE_INSTALL_PREFIX=/usr/local -DSEND_ODOMETRY_DATA=ON -DGENERATE_ROS_MODELS=ON -GNinja /home/a/PX4/PX4-Autopilot/Tools/simulation/gazebo/sitl_gazebo && /usr/bin/cmake -E touch /home/a/PX4/PX4-Autopilot/build/px4_sitl_default/external/Stamp/sitl_gazebo/sitl_gazebo-configure
  > [855/861] Building CXX object src/modu...es__mavlink.dir/mavlink_messages.cpp.o
  > ninja: build stopped: subcommand failed.
  > make: *** [Makefile:232: px4_sitl_default] Error 1
  > ```
  >
  > You can `distclean` and rebuild
  > ```sh
  > make distclean
  > make px4_sitl_rtps gazebo_iris__myself
  > ```  
  > Reference: <https://www.cnblogs.com/hnrainll/archive/2011/06/08/2075052.html>

## Sync the msg betweend PX4 and ROS2

1. Sync the messages
  run `uorb_to_ros_msgs.py` belong to `PX4/PX4-Autopilot/msg/tools/`:
  ```
  cd ~/PX4/PX4-Autopilot/msg/tools/
  ./uorb_to_ros_msgs.py ~/PX4/PX4-Autopilot/msg/ ~/PX4/px4_ros_com_ros2/src/px4_msgs/msg/
  ```
2. Add the topics of `vehicle_local_position`
  modify `urtps_bridge_topics.yaml` belong to `PX4/PX4-Autopilot/msg/tools/`:
  ```
  -msg:  vehicle_local_position
  seng: true
  ```
  then run the `uorb_to_ros_urtps_topic.py`
  > usage: uorb_to_ros_urtps_topics.py [-h] [-i INFILE] [-o OUTFILE] [-q]
  ```sh
  python3 uorb_to_ros_urtps_topics.py -i ~/PX4/PX4-Autopilot/msg/tools/urtps_bridge_topics.yaml -o ~/PX4/px4_ros_com_ros2/src/px4_ros_com/templates/urtps_bridge_topics.yaml
  ```

## Modification of ROS2

1. Modify the `CMakeList.txt` in `/home/zy/PX4/px4_ros_com_ros2/src/px4_ros_com/`
  + add library of `opencv` and `cv_bridge`
  ```
  find_package(px4_msgs REQUIRED)
  find_package(sensor_msgs REQUIRED)
  find_package(geometry_msgs REQUIRED)
  find_package(cv_bridge REQUIRED)
  find_package(OpenCV REQUIRED)
  ```
  ```
  function(custom_executable subfolder target)
  add_executable(${target} src/${subfolder}/${target}.cpp)
  ament_target_dependencies(${target}
    rclcpp
    px4_msgs
    sensor_msgs
    std_msgs
    cv_bridge
    OpenCV
  )
  ```
  + add `.cpp`
  ```
  # Add examples
  custom_executable(examples/listeners sensor_combined_listener)
  custom_executable(examples/listeners vehicle_gps_position_listener)
  custom_executable(examples/advertisers debug_vect_advertiser)
  custom_executable(examples/offboard offboard_control)
  custom_executable(examples/offboard offboard_control_v1)
  custom_executable(examples/offboard img)
  ```
2. `offboard_control_v1.cpp`  
    This part is seting the position setpoint.

3. `img.cpp`  
    This part is showing the topic of `cable_camera`.

4. clean and rebuild the workspace
  ```sh
  cd /home/zy/PX4/px4_ros_com_ros2/src/px4_ros_com/scripts
  source clean.bash
  ```
  then
  ```sh
  cd /home/zy/PX4/px4_ros_com_ros2/src/px4_ros_com/scripts
  source build_ros2_workspace.bash
  ```
  > When some errors happended cause the build failed and terminal closed quickly, you do not see what error.  
  > You can run follow commander, moving the output to `output.txt`, then you can see the error on the terminal.
  > ```sh
  > source build_ros2_workspace.bash | tee output.txt
  > ```
  > Reference: <https://blog.csdn.net/tengh/article/details/41823883>
