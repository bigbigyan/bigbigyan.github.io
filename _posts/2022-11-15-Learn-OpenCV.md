---
layout: post
title: Learn OpenCV
author: Yan Zhou
date: 2022-11-15 16:00 +0800
last_modified_at: 2022-11-16 12:30:00 +0800
tags: [OpenCV]
toc:  true
---


## Install OpenCV

1. Download the source code  
     <https://opencv.org/releases/>
2. Configure dependencies
      ```sh
      sudo apt-get install build-essential 
      sudo apt-get install cmake git libgtk2.0-dev pkg-config libavcodec-dev libavformat-dev libswscale-dev
      sudo apt-get install python-dev python-numpy libtbb2 libtbb-dev libjpeg-dev libpng-dev libtiff-dev libjasper-dev libdc1394-22-dev
      ```
      > error: E: Unable to locate package libjasper-dev   
      > ```sh
      > sudo add-apt-repository "deb http://security.ubuntu.com/ubuntu xenial-security main"  
      > sudo apt update  
      > sudo apt install libjasper1 libjasper-dev  
      > ```
      >Reference: <https://blog.csdn.net/qq_44830040/article/details/105961295>  
3. Compile source code
      + create the build directory
      ```sh
      cd opencv
      mkdir build
      cd build
      ```
      + compile code
      ```sh
      sudo cmake -D CMAKE_BUILD_TYPE=Release -D CMAKE_INSTALL_PREFIX=/usr/local ..
      sudo make -j4（4 is the number of thread）
      sudo make install
      ```
4. Modify the system configuration file
      + add path
      open the `opencv.conf` file  
      ```sh
      sudo gedit /etc/ld.so.conf.d/opencv.conf
      ```
      add the following code at the end of the file  
      ```
      /usr/loacal/lib
      ```
      save and close the file. then run commander:  
      ```sh
      sudo ldconfig
      ```
      + configuration surroundings
      open the `.bashrc`
      ```sh
      sudo gedit /etc/bash.bashrc 
      ```
      add the following code at the end of the file
      ```
      PKG_CONFIG_PATH=$PKG_CONFIG_PATH:/usr/local/lib/pkgconfig
      export PKG_CONFIG_PATH
      ```
      save and close the file. then run commander:
      ```
      source /etc/bash.bashrc
      sudo updatedb
      ```
      > if it appears `sudo: updatedb: command not found`,  
      > perform `sudo apt install mlocate`, then it will be ok.
5. Verify
      ```sh
      pkg-config --modversion opencv4
      ```

Reference: <https://onlyloveyd.blog.csdn.net/article/details/124557135>  
Referemce: <https://blog.csdn.net/hy2014x/article/details/127189486>



