// Task Scheduler v2026-03-11-0001
// Copyright (c) 2025-2026 delfineonx, chmod, FrostyCaveman
// SPDX-License-Identifier: Apache-2.0

{
  let _TS={
    currentTick:0,
    noTask:Object.freeze(()=>{}),
    run:null,
    stop:null,
    isGroupActive:null,
    cancel:null,
    isTaskActive:null,
    getGroupId:null,
    tick:null
  },
  _errorStyledText=[{
    str:"",
    style:{
      color:"#FF775E",
      fontWeight:"500",
      fontSize:"0.95rem"
    }
  }],
  _defaultGroupId="default",
  _tasks=Object.create(null),
  _groupCount=Object.create(null),
  _groupStop=Object.create(null),
  _operationId=1,
  _currentTick=0,
  _queueCursor=0,
  _tickState=1,
  _taskState=2,
  _isTaskActive=!1;
  const _logError=message=>{
    _errorStyledText[0].str="Task Scheduler "+message;
    api.broadcastMessage(_errorStyledText);
    _errorStyledText[0].str=""
  };
  _TS.run=(task,delay,groupId)=>{
    groupId??=_defaultGroupId;
    delay=(delay|0)*.02|0;
    delay=delay&~(delay>>31);
    let targetTick=_currentTick+delay+(!delay&_tickState),
    queue=_tasks[targetTick],
    count=_groupCount[groupId],
    index=2;
    if(!queue&&delay){
      if(count===void 0){
        count=1;
        _groupStop[groupId]=1
      }else if(~count&1){
        count++
      }
      _tasks[targetTick]=[task,groupId,++_operationId];
      _groupCount[groupId]=count+2
    }else if(queue&&delay){
      if(count===void 0){
        count=1;
        _groupStop[groupId]=1
      }else if(~count&1){
        count++
      }
      index=queue.length-1;
      queue[++index]=task;
      queue[++index]=groupId;
      queue[++index]=++_operationId;
      _groupCount[groupId]=count+2
    }else if(!queue&&!delay){
      if(count===void 0){
        count=1;
        _groupStop[groupId]=1
      }else if(~count&1){
        count++
      }
      queue=_tasks[targetTick]=[task,groupId,++_operationId];
      _groupCount[groupId]=count+2;
      try{
        task();
        queue[2]=1
      }catch(error){
        queue[2]=1;
        _logError("["+groupId+"]: "+error.name+": "+error.message+".")
      }
    }else{
      if(count===void 0){
        count=1;
        _groupStop[groupId]=1
      }else if(~count&1){
        count++
      }
      index=queue.length-1;
      queue[++index]=task;
      queue[++index]=groupId;
      queue[++index]=++_operationId;
      _groupCount[groupId]=count+2;
      try{
        task();
        queue[index]=1
      }catch(error){
        queue[index]=1;
        _logError("["+groupId+"]: "+error.name+": "+error.message+".")
      }
    }
    return[targetTick,index]
  };
  _TS.stop=groupId=>{
    groupId??=_defaultGroupId;
    if(_groupCount[groupId]&1){
      _groupCount[groupId]--;
      _groupStop[groupId]=++_operationId;
      return !0
    }
    return !1
  };
  _TS.isGroupActive=groupId=>{
    groupId??=_defaultGroupId;
    return!!(_groupCount[groupId]&1)
  };
  _TS.cancel=taskId=>{
    let queue=_tasks[taskId[0]],
    index=taskId[1]>>>0;
    if(!queue||index>=queue.length){
      return !1
    }
    queue[index]=1;
    return !0
  };
  _TS.isTaskActive=taskId=>{
    let queue=_tasks[taskId[0]],
    index=taskId[1]>>>0;
    if(!queue||index>=queue.length){
      return !1
    }
    return queue[index]>_groupStop[queue[index-1]]
  };
  _TS.getGroupId=taskId=>{
    let queue=_tasks[taskId[0]],
    index=taskId[1]>>>0;
    if(!queue||index>=queue.length){
      return null
    }
    return queue[index-1]
  };
  _TS.tick=()=>{
    _TS.currentTick=_currentTick+=_tickState;
    let queue=_tasks[_currentTick];
    _tickState=0;
    if(queue){
      let groupId,operationId;
      do{
        try{
          while(operationId=queue[_queueCursor+2]){
            groupId=queue[_queueCursor+1];
            if(_taskState&2){
              _isTaskActive=operationId>_groupStop[groupId];
              _groupCount[groupId]-=2;
              _taskState=1
            }
            if(_isTaskActive&_taskState){
              queue[_queueCursor]()
            }
            _taskState=4;
            if(_groupCount[groupId]<2){
              delete _groupCount[groupId];
              delete _groupStop[groupId]
            }
            _taskState=2;
            _queueCursor+=3
          }
          delete _tasks[_currentTick];
          _queueCursor=0;
          break
        }catch(error){
          _taskState=4;
          if(_groupCount[groupId]<2){
            delete _groupCount[groupId];
            delete _groupStop[groupId]
          }
          _taskState=2;
          _queueCursor+=3;
          _logError("["+groupId+"]: "+error.name+": "+error.message+".")
        }
      }while(!0)
    }
    _tickState=1
  };
  Object.seal(_TS);
  globalThis.TS=_TS;
  void 0
}

