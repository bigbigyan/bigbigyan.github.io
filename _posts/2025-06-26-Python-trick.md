---
layout: post
title: Python trick
author: Yan Zhou
date: 2025-06-26 14:00 +0800
last_modified_at: 2025-06-27 14:30:00 +0800
tags: [Python, trick]
toc:  true
---
1.breakpoint()  
    - 在Python 3.7及以上版本中，可以使用`breakpoint()`函数来设置断点，类似于`pdb.set_trace()`。它会自动调用`pdb`模块，方便调试。
    进入调试模式后可使用这些命令：

    h(elp)：查看帮助
    n(ext)：执行下一行（不进入函数）
    s(tep)：执行下一行（进入函数）
    c(ontinue)：继续运行直到下一个断点
    l(ist)：显示当前代码上下文
    p <变量>：打印变量值
    pp <表达式>：美化打印表达式
    q(uit)：退出调试
    b(reak) [行号]：设置新断点
    w(here)：显示调用栈