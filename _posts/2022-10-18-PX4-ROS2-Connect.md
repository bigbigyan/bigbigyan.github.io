---
layout: post
title: PX4 ROS2 Connect
author: Yan Zhou
date: 2022-10-18 14:00 +0800
last_modified_at: 2022-10-19 14:30:00 +0800
tags: [PX4, ROS2, RTPS]
toc:  true
---

## Create ROS2 work space

> Beforce create ROS2 work space, you shoule sync the message between PX4 and ROS2.

1. Create a workspace directory using:
      ```
      mkdir -p ~/px4_ros_com_ros2/src
      ```
2. Clone the ROS 2 bridge packages `px4_ros_com` and `px4_msgs` to the `/src` directory (the master branch is cloned by default):
      ```
      git clone https://github.com/PX4/px4_ros_com.git ~/px4_ros_com_ros2/src/px4_ros_com
      git clone https://github.com/PX4/px4_msgs.git ~/px4_ros_com_ros2/src/px4_msgs
      ```
3. Use the `build_ros2_workspace.bash` script to build the ROS 2 workspace (including `px4_ros_com` and `px4_msgs`):
      ```
      cd ~/px4_ros_com_ros2/src/px4_ros_com/scripts
      source build_ros2_workspace.bash
      ```

Reference: <https://docs.px4.io/main/en/ros/ros2_comm.html>

## Run a example

1. Open a new terminal in the root of the PX4 Autopilot project, and then start a PX4 Gazebo simulation using:
      ```
      make px4_sitl_rtps gazebo
      ```
2. On a new terminal, `source` the ROS 2 workspace and then start the `micrortps_agent` daemon with UDP as the transport protocol:
      ```
      source ~/px4_ros_com_ros2/install/setup.bash
      micrortps_agent -t UDP
      ```
3. On a new terminal, `source` the ROS 2 workspace and the run the scribe:
      ```
      source ~/px4_ros_com_ros2/install/setup.bash
      ros2 run px4_ros_com offbpard_control
      ```

Reference: <https://docs.px4.io/main/en/ros/ros2_comm.html>

## Noting

### Synchronized message between PX4 and ROS 2:

1. Modify the file `uorb_to_ros_msgs.py` belong to `PX4/PX4-Autopilot/msg/tools/`:
      ```
      input_dir = '/home/zy/PX4/PX4-Autopilot/msg/' # the address of msg in PX4
      output_dir = '/home/zy/PX4/px4_ros_com_ros2/src/px4_msgs/msg/' # the address od msg in ROS 2
      ```
from
      ```
      input_dir = sys.argv[1]
      output_dir = sys.argv[2]
      ```
      > Don't ignote the `/` behind the `msg/`.
2. Run the file `uorb_to_ros_msgs.py` and the finish the sync of msg:
      ```
      python3 uorb_to_ros_msgs.py
      ```
3. Modify the file `uorb_to_ros_urtps_topic.py` belong to `PX4/PX4-Autopilot/msg/tools/`:
      ```
      in_file = Path('/home/zy/PX4/PX4-Autopilot/msg/tools/urtps_bridge_topics.yaml')
      # the address of urtps_bridge_topics.yaml in PX4
      out_file = Path('/home/zy/PX4/px4_ros_com_ros2/src/px4_ros_com/templates/urtps_bridge_topics.yaml') if (
      Path('/home/zy/PX4/px4_ros_com_ros2/src/px4_ros_com/templates/urtps_bridge_topics.yaml') != in_file and Path('/home/zy/PX4/px4_ros_com_ros2/src/px4_ros_com/templates/urtps_bridge_topics.yaml') != "") else in_file
      # the address of urtps_bridge_topics.yaml in ROS 2 workspace
      ```
from
      ```
      in_file = Path(args.input_file)
      out_file = Path(args.output_file) if (
            Path(args.output_file) != in_file and Path(args.output_file) != "") else in_file
      ```
4. Run the file `uorb_to_ros_urtps_topic.py`:
      ```
      python3 uorb_to_ros_urtps_topic.py
      ```
5. Then the msg and urtps topics will sync


### Add new message between PX4 and ROS 2:

1. Add the msg topics in the file `urtps_bridge_topics.yaml`, example add `vehicle_local_position`:
      ```
      - msg:     vehicle_local_position
       send:     true
      ```
2. CLean up the ROS 2 workspace, `source` the scripts in `px4_ros_com/scripts/clean_all.bash`:
      ```
      source clean_all.bash
      ```
3. Sync the msg between PX4 and ROS 2, the procedure is in above.
4. Rebuild the ROS 2 workspace, `source` the scripts in `px4_ros_com/scripts/build_ros2_workspace.bash`:
      ```
      source build_ros2_workspace.bash
      ```

Reference: <https://github.com/PX4/PX4-Autopilot/issues/18895>

### Common problem

1. Run the `micrortps_agent -t UDP` with 
      ```
      terminate called after throwing an instance of 'eprosima::fastcdr::exception::BadParamException' 
      what(): Unexpected byte value in Cdr::deserialize(bool), expected 0 or 1
      ```
      etc. You shoule check out the sync of msg between PX4 and ROS 2.
2. Build ROS 2 workspace failed 
      ```
      source build_ros2_workspace.bash
      ```
      You shoule check out the file in the `px4_ros_com`, maybe some `.cpp` or `.py` connot be compiled.
3. Terminal with PX4 show `Failsafe mode active `, open the QGC and setting `COM_RCL_EXCEPT = 4`.  
      Reference: <https://github.com/PX4/px4_ros_com/issues/111>


 