---
layout: post
title: Learning Fast Planner (Theory)
author: Yan Zhou
date: 2023-02-26 09:30 +0800
last_modified_at: 2022-03-02 18:30:00 +0800
tags: [Trajectory,Fast-planner,theory]
toc:  true
math: true
---

# Kinodynamic Path Searching
This kinodynamic path searching module is originated from the hybrid-state A*[^1]  

> **Algorithm : Kinodynamic Path Searching**  
> Initialize();  
> while \\\(\neg\\\) $$\mathcal{P}$$.empty() do  
      \\\(\qquad\\\) \\\(n_c\\\) \\\(\leftarrow\\\) \\\(\mathcal{P}\\\).pop() , \\\(\mathcal{C}\\\).insert(\\\(n_c\\\));  
      \\\(\qquad\\\) if ReachGoal(\\\(n_c\\\)) \\\(\vee\\\) AnalyticExpand(\\\(n_c\\\)) then  
            \\\(\qquad\qquad\\\) return RetrievePath();  
      \\\(\qquad\\\) \\\(primitives\\\) \\\(\leftarrow\\\) Expand(\\\(n_c\\\));  
      \\\(\qquad\\\) \\\(nodes\\\) \\\(\leftarrow\\\) Prune(\\\(primitives\\\));  
      \\\(\qquad\\\) for \\\(n_i\\\) in \\\(nodes\\\) do  
      \\\(\qquad\qquad\\\) if \\\(\neg\\\) \\\(\mathcal{C}\\\).contain(\\\(n_i\\\)) \\\(\wedge\\\) CheckFeasible(\\\(n_i\\\)) then  
      \\\(\qquad\qquad\qquad\\\) \\\(g_{temp}\\\) \\\(\leftarrow\\\) \\\(n_c \cdot g_c\\\) + EdgeCost(\\\(n_i\\\));  
      \\\(\qquad\qquad\qquad\\\) if \\\(\neg\\\) \\\(\mathcal{P}\\\).contain(\\\(n_i\\\) then)  
      \\\(\qquad\qquad\qquad\qquad\\\) \\\(\mathcal{P}\\\).add(\\\(n_i\\\));  
      \\\(\qquad\qquad\qquad\\\) else if \\\(g_{temp} \geq n_i \cdot g_c\\\) then  
      \\\(\qquad\qquad\qquad\qquad\\\) contiune;  
      \\\(\qquad\qquad\qquad\\\) \\\(n_i \cdot parent \leftarrow n_c, \quad n_i \cdot g_c \leftarrow g_{temp}\\\);  
      \\\(\qquad\qquad\qquad\\\) \\\(n_i \cdot f_c \leftarrow n_i \cdot g_c\\\) + Heuristic(\\\(n_i\\\));  
>        
> \\\(\mathcal{P}\\\) is the open set, and \\\(\mathcal{C}\\\) is the close set.  

## Primitive Generation
trajectory polynominal functions
:     

$$
      \mathbf{p}(t) := [p_x(t),p_y(t),p_z(t)]^T, \quad p_{\mu}(t) = \sum_{k=0}^k a_kt^k \quad \mu \in {x,y,z}
$$

> \\\(p\\\) \\\(\rightarrow\\\) position, \\\(\quad\\\) \\\(a\\\) \\\(\rightarrow\\\) acceleration.  

state vector
:     

$$
      \mathbf{x}(t) := [\mathbf{p}(t)^T, \dot{\mathbf{p}}(t)^T, \cdots ,\mathbf{p}^{n-1}(t)^T]^T \in \mathcal{X} \subset \mathbb{R}^{3n}
$$

control input
:     

$$
      \mathbf{u}(t) := \mathbf{p}^{(n)}(t) \in \mathcal{U} := [-u_{max}, u_{max}]^3 \subset \mathbb{R}^3
$$

state space model
:     

$$
      \dot{\mathbf{x}} = \mathbf{A} \mathbf{x} + \mathbf{B} \mathbf{u}  
$$

$$
      \mathbf{A} = 
      \left[
      \begin{matrix}
      0 & I_3 & 0 & \cdots & 0 \\
      0 & 0 & I_3 & \cdots & 0 \\
      \vdots & \vdots & \vdots & \ddots & \vdots \\
      0 & \cdots & \cdots & 0 & I_3 \\
      0 & \cdots & \cdots & 0 & 0 \\
      \end{matrix}
      \right],
      \quad
      \mathbf{B} = 
      \left[
      \begin{matrix}
      0 \\
      0 \\
      \vdots \\
      0 \\
      I_3 \\
      \end{matrix}
      \right]
$$

> \\\(\dot{\mathbf{x}}\\\) is the changes of system state in countinu system, not the derivative of \\\(\mathbf{x}\\\).  
> In the discrete system, \\\(x_{k+1} = Ax_k+Bu\\\)  

complete solution for state equation
:     

$$
      \mathbf{x}(t) = e^{\mathbf{A}t} \mathbf{x}(0) + \int_0^t{e^{\mathbf{A}(t-\tau)} \mathbf{B} \mathbf{u}(\tau)} {\rm d}x
$$

A set of discretized control input $$\quad \mathcal{U}_D \subset \mathcal{U} \quad$$ for duration \\\(\tau\\\).
Each axis \\\([-u_{max},u_{max}]\\\) is discretized uniformly as \\\(\lbrace -u_{max},-\frac{r-1}{r}u_{max}, \cdots, \frac{r-1}{r}u_{max}, u_{max} \rbrace\\\). \\\(\quad\\\) All \\\((2r+1)^3\\\) primitives.  

In practice \\\(n=2,\quad r=0.5\\\)

$$
      \left\{
            \begin{aligned}
            \mathbf{x}(t) &= [\mathbf{p}(t)^T,\dot{\mathbf{p}}(t)^T]^T = [p,v] \\
            \mathbf{u}(t) &= a \\
            \mathcal{U}_D &= [-u,0,u] \\
            \end{aligned}
      \right.
$$

## Actual Cost and Heuristic Cost

Aim
:     minimise the time and control cost  

cost function
:     

$$
      \mathcal{J}(T) = \int_0^T{||\mathbf{u}(t)||^2}{\rm d}t + \rho T
$$

### actual cost

actual cost $$ g_c $$
:     the actual cost of an optimal path from the star state $$ \mathbf{x}_s $$ to the current state $$ \mathbf{x}_c $$  

$$
      g_c = \sum^{J}_{j=1} {(||\mathbf{u}_{dj}||^2 + \rho)\tau}
$$

> discretized input $$ \mathbf{u}(t) = \mathbf{u}_d $$ and duration $$ \tau $$. $$ \quad J $$ primitives consist the optimal path  

### heuristic cost

minisize $$ \mathcal{J}(T) $$ from $$ \mathbf{x}_c $$ to the goal state $$ \mathbf{x}_g $$ by applying the Pontryagins minimum principle[^2]:  

$$
      p_{\mu}^* = \frac{1}{6} \alpha _\mu t^3 + \frac{1}{2} \beta _\mu t^2 + v_{\mu c} + p_{\mu c}  
$$

$$
      \left[
            \begin{matrix}
            \alpha _\mu \\
            \beta _\mu \\
            \end{matrix}
      \right]
      =\frac{1}{T^3}
      \left[
            \begin{matrix}
            -12 & 6T \\
            6T & -2T^2 \\
            \end{matrix}
      \right]
      \left[
            \begin{matrix}
            p_{\mu g} - p_{\mu c} - v_{\mu c}T \\
            v_{\mu g} - v_{\mu c} \\
            \end{matrix}
      \right]
$$

$$
      \mathcal{J}^*(T) = \sum_{\mu \in \{x,y,z\}} (\frac{1}{3} \alpha_{\mu}^2T^3 + \alpha_{\mu} \beta_{\mu}T^2 + \beta_{\mu}^2T)
$$

> where $$ p_{\mu c}, v_{\mu c}, p_{\mu g}, v_{\mu g} $$ are the current and goal position and velocity  

+ subsitute $$ \alpha_\mu \beta_\mu $$ into $$ \mathcal{J}^*(T) $$ and find the roots of $$ \frac{\partial \mathcal{J}^*(T)}{\partial T} = 0 $$  

+ select a root that makes a minimum cost $$ \min \mathcal{J}^* $$ and feasible trajectory denoted as $$ T_h $$  

+ $$ \mathcal{J}^*(T_h) $$ as the heuristic $$ h_c $$.

Finally, $$ f_c $$ is defined as:
:     

$$
      f_c = g_c + h_c = g_c + \mathcal{J}^*(T_h)
$$

***

**explain the $$ \mathcal{J}^*(T) $$**

state:
:     $$ s_k = (p_k, v_k) $$ for each axis $$k$$. The $$a_k$$ is taken as input.  

system equation:
:     $$ \dot{s} = f_s(s_k,a_k) = (v_k, a_k) $$  

Hamiltonian function $$ H(s,a,\lambda) $$ with costate $$ \lambda = (\lambda_1, \lambda_2) $$ :
:     $$ H(s,a,\lambda) = \frac{1}{T}a^2 + \lambda^T f_s(s,a) = \frac{1}{T}a^2 + \lambda_1 v + \lambda_2 a $$  

costate differential equation:
:     $$ \dot{\lambda} = - \nabla_s H(s^*,a^*,\lambda) = (0,-\lambda_1) $$  
> where $$ a^*_k $$ and $$ s^*_k $$ represent the optimal input and state trajectories, respectively. $$ \dot{\lambda_1} = -\frac{\partial H}{\partial p} = 0 $$ $$ 
\quad \dot{\lambda_2} = -\frac{\partial H}{\partial v} = -\lambda_1 $$  

the solution is written in the constants $$ \alpha,\beta $$ for late convenience:
:     $$ \dot{\lambda} = \left[
      \begin{matrix}
      0 \\
      -\lambda_1 \\
      \end{matrix}
      \right]
      \quad
      \lambda(t) = \frac{1}{T} \left[
      \begin{matrix}
      -2\alpha \\
      2\alpha t + 2\beta \\
      \end{matrix}
      \right]
      $$  

the optimal input trajectory is solved:
:     $$ 
      \begin{aligned}
      a^*(t) &= \arg \min_{a(t)} H(s^*(t),a(t),\lambda(t)) \\
      &= \arg \min_{a(t)} \frac{1}{T}[a^2 - 2\alpha v + 2(\alpha t + \beta)a] \\
      &= \alpha t + \beta
      \end{aligned}
      $$

the optimal state trajectory:
:     $$ s^*(t) = 
      \left[
            \begin{matrix}
            p^* \\
            v^* \\
            \end{matrix}
      \right]
      = \left[
            \begin{matrix}
            \frac{1}{6} \alpha t^3 + \frac{1}{2} \beta t^2 + v_c t +p_c \\
            \frac{1}{2} \alpha t^2 + \beta t + v_c \\
            \end{matrix}
      \right]
      $$  

$$ \alpha,\beta $$ can be solved for as a function of the desired end translational state:
:     $$
      \begin{aligned}
      \frac{1}{6} \alpha t^3 + \frac{1}{2} \beta t^2 + v_c t +p_c &= p_g \\
      \frac{1}{2} \alpha t^2 + \beta t + v_c &= v_g \\
      \left[
            \begin{matrix}
            \frac{1}{6}T^3 & \frac{1}{2}T^2 \\
            \frac{1}{2}T^2 & \beta T \\
            \end{matrix}
      \right]
      \left[
            \begin{matrix}
            \alpha \\
            \beta \\
            \end{matrix}
      \right]
      =
      \left[
            \begin{matrix}
            p_g-p_c-v_cT \\
            v_g-v_c \\
            \end{matrix}
      \right] \\
      \left[
            \begin{matrix}
            \alpha \\
            \beta \\
            \end{matrix}
      \right]
      = \frac{1}{T^3}
      \left[
            \begin{matrix}
            -12 & 6T \\
            6T & -2T^2 \\
            \end{matrix}
      \right]
      \left[
            \begin{matrix}
            p_g-p_c-v_cT \\
            v_g-v_c \\
            \end{matrix}
      \right] 
      \end{aligned}
      $$  

the cost function:
:     $$
      \begin{aligned}
      \mathcal{J}^*(t) &= \int_0^t ||a^*||^2 {rm d}t \\
      &= \int_0^t ||\alpha t + \beta||^2 {rm d}t \\
      &= \int_0^t \alpha^2 t^2 + 2 \alpha \beta t + \beta^2 {rm d}t \\
      &= \frac{1}{3} \alpha^2 t^3 + \alpha \beta t^2 + \beta^2 t \\
      \end{aligned}
      $$  

> Reference: <https://lanxzheng.blog.csdn.net/article/details/124845417>  

*****

# B-Spline trajectory optimization

## Uniform B-splines

A B-spline is determined by:
:     degree $$ p_b $$  
      a set of $$ N+1 $$ control points $$ \{Q_0,Q_1,\cdots,Q_N \} $$. $$ \quad Q_i \in \mathbb{R}^3 $$  
      a knot vector $$ [t_0,t_1,\cdots,t_M] $$. $$ \quad t_m \in \mathbb{R} \quad M = N + p_b + 1 $$  
      > Time $$ t $$ can be used to parameterize the B-spline tracjectory. $$ t \in [t_{p_b},t_{M-p_b}] $$  
      > For a uniform B-spline, each knot span $$ \Delta t_m = t_{m+1} - t_m $$ has identical value $$ \Delta t $$  

The position can be evaluated using the matrix representation[^3]:
:     $$
      \begin{aligned}
      \mathbf{p} (s(t)) &= \mathbf{s}(t)^T \mathbf{M}_{p_b+1} \mathbf{q}_m \\
      \mathbf{s}(t) &= [1 \quad s(t) \quad s^2(t) \quad \cdots \quad s^{p_b}(t)]^T \\
      \mathbf{q}_m &= [Q_{m-p_b} \quad Q_{m-p_b+1} \quad Q_{m-p_b+2} \quad \cdots \quad Q_{m}]^T \\
      \end{aligned}
      $$  
      > time $$ t \in [t_m,t_{m+1}] \subset [t_{p_b},t_{M-p_b}]$$  
      > normalize $$ t $$ as $$ s(t) = \frac{t-t_m}{\Delta t} $$  
      > $$ M_{p_b + 1} $$ is a constant matrix determined by $$ p_b $$  
      > $$ p_b $$ is set as 3  

## Convex Hull Property

velocity:
:     control points $$ \{ V_0,V_1,\cdots,V_{N-1} \} \quad V_i \in [-v_{max},v_{max}]$$  
      $$ V_i = \frac{1}{\Delta t} (Q_{i+1} - Q_i) $$  

acceleration:
:     control points $$ \{ A_0,A_1,\cdots,A_{N-2} \} \quad A_i \in [-A_{max},A_{max}]$$  
      $$ A_i = \frac{1}{\Delta t} (V_{i+1} - V_i) $$  

collision-free:
:     need to ensure that $$ d_h > 0 $$  
      by the triangle inequality, $$ d_h > d_c - r_h $$  
      $$ Q_h $$ is inside the convex hull, $$ r_h < r_{12} + r_{23} + r_{34} $$  
      combine them $$ d_h > d_c - (r_{12} + r_{23} + r_{34}) $$  
      Therefore, if we ensure: $$ d_c > 0,\quad r_{j,j+1} < \frac{d_c}{3} (j \in \{ 1,2,3 \}) $$ then the convex hull is guaranteed to be collision-free.  

      > $$ d_h $$ is the distance between any one occupied voxel and $$ Q_h $$  
      > $$ Q_h $$ is any one point in the convec hull  
      > $$ d_c $$ is the distance between the voxel and any one control point  
      > The illustration of picture is more clearly. In the paper Fig. 4  

## Problem Formulation

For B-spline trajectory with $$ p_b $$ degree defined by $$ \{Q_0,Q_1,\cdots,Q_N \} $$, we optimize the subset $$ \{Q_{p_b},Q_{p_b + 1},\cdots,Q_{N - p_b} \} $$.

Overall cost function:
:     $$ f_{total} = \lambda_1 f_s + \lambda_2 f_c + \lambda_3 (f_v + f_a)$$  
      > $$ f_s $$ and $$ f_c $$ are smoothness and collision cost  
      > $$ f_v $$ and $$ f_a $$ are soft limits on velocity and acceleration.

smoothness cost:
:     $$
      f_s = \sum_{i=p_b-1}^{N-p_b+1} || \underbrace{Q_{i+1}-Q_i}_{F_{i+1},i} + \underbrace{Q_{i-1}-Q_i}_{F_{i-1},i} ||^2
      $$  

collision cost:
:     $$
      f_c = \sum_{i=p_b}^{N-p_b}{F_c(d(Q_i))}
      $$  
      $$
      F_c(d(Q_i)) = 
      \begin{cases}
      (d(Q_i) - d_thr)^2  &d(Q_i) \leq d_{thr} \\
      0                   &d(Q_i) > d_{thr} \\
      \end{cases}
       $$
      > $$ d(Q_i) $$ is the distance between $$ Q_i $$ and the closet obstacle  
      > $$ d_{thr} $$ specify the threshold of obstacle clearance  

velocity and acceleration penalty:
:     $$
      f_v = \sum_{\mu \in \{ x,y,z \}} \sum_{i=p_b-1}^{N-p_b}{F_v(V_{i \mu})}, \quad f_a = \sum_{\mu \in \{ x,y,z \}} \sum_{i=p_b-2}^{N-p_b}{F_a(A_{i \mu})}
      $$  

      The penalty for 1-D velocity $$ v_{\mu} $$ is: (acceleration penalty has identical form)  
      $$
      F_v(v_{\mu}) = 
      \begin{cases}
      (v_\mu^2 - v_{max}^2)^2  &v_\mu^2 > v_{max}^2 \\
      0 &v_\mu^2 \leq v_{max}^2 \\
      \end{cases}
      $$  

## Time adjustment

The control points of a non-uniform B-spline's first and second order derivatives $$ \rm{V}'_i $$ and $$ \rm{A}'_i $$ can be computed by:  

$$
      V'_i = \frac{p_b(Q_{i+1,\mu} - Q_{i,\mu})}{t_{i+p_b+1}-t_{i+1}},
      A'_i = \frac{(p_b-1)(V'_{i+1,\mu} - V'_{i,\mu})}{t_{i+p_b+1}-t_{i+1}} 
$$

velocity:
:     let $$ \rm{V}'_i = [V'_{i,x},V'_{i,y},V'_{i,z}] $$ be an infeasible control point of velocity.  
      $$ |V'_{i,\mu}| = v_m $$ be the largest infeasible component.  
      we change the duration to $$ \hat{t}_{i+p_b+1}-\hat{t}_{i+1}  = \mu_v(t_{i+p_b+1}-t_{i+1})$$, then $$ V'_{i,\mu} $$ changes to:
      $$
      \begin{aligned}
      \hat{V}'_{i,\mu} &= \frac{p_b}{\hat{t}_{i+p_b+1}-\hat{t}_{i+1}} (Q_{i+1,\mu} - Q_{i,\mu}) \\
      &= \frac{1}{\mu_v} \frac{p_b}{t_{i+p_b+1}-t_{i+1}} (Q_{i+1,\mu} - Q_{i,\mu}) \\
      &= \frac{1}{\mu_v} V'_{i,\mu} \\
      \end{aligned}
      $$  
      set $$ \mu_v = \frac{v_m}{v_{mac}} $$, then the velocity is feasible.  

acceleration:
:     $$
      \begin{aligned}
      \hat{A}'_{i,\mu} &= \frac{p_b-1}{\hat{t}_{i+p_b+1}-\hat{t}_{i+2}} (\hat{V}_{i+1,\mu} - \hat{V}_{i,\mu}) \\
      &= \frac{1}{\mu_a} \frac{p_b-1}{t_{i+p_b+1}-t_{i+1}} (\frac{1}{\mu_a} V'_{i+1,\mu}  - \frac{1}{\mu_a} V'_{i,\mu} ) \\
      &= \frac{1}{\mu_a^2} \frac{p_b-1}{t_{i+p_b+1}-t_{i+1}} (V'_{i+1,\mu} - V'_{i,\mu} ) \\
      &= \frac{1}{\mu_a} A'_{i,\mu} \\
      \end{aligned}
      $$  
      set $$ \mu_a = (\frac{a_m}{a_{mac}})^{\frac 12} $$, then the acceleration is feasible.  





















[^1]:Dolgov, Dmitri, et al. "Path planning for autonomous vehicles in unknown semi-structured environments." The international journal of robotics research 29.5 (2010): 485-501.  

[^2]:Mueller, Mark W., Markus Hehn, and Raffaello D'Andrea. "A computationally efficient motion primitive for quadrocopter trajectory generation." IEEE transactions on robotics 31.6 (2015): 1294-1310.  

[^3]:Qin, Kaihuai. "General matrix representations for B-splines." Proceedings Pacific Graphics' 98. Sixth Pacific Conference on Computer Graphics and Applications (Cat. No. 98EX208). IEEE, 1998.  