const Interview = require("../models/Interview");
const Participants = require("../models/Participants");
const serverClient =require('../config/postmark');



const getInterviews = async (req,res)=>{
   try{
      const interviews = await Interview.find({}).populate('participants','email name').exec();
      const interviewsTransformed=[]
      for(let i=0;i<=interviews.length-1;i++){
       interviewsTransformed.push({
           participants:interviews[i].participants,
           startTime: interviews[i].startTime.toLocaleString("en-US", {timeZone: "Asia/Calcutta"}),
           endTime:interviews[i].endTime.toLocaleString("en-US", {timeZone: "Asia/Calcutta"})

       })
      }
      res.status(200).send({
         interviews: interviewsTransformed
      })
   }catch(e){
       console.log(e)
       res.status(400).send({
           error:e.toString()
       })
   }
}

const postInterview = async (req,res)=>{
    try{
        if(req.body.participants.length<2)
        throw new Error("Number of participants for the interview must be greater than or equal to 2")

        const startTimeNew = new Date(req.body.startTime);
        const endTimeNew = new Date(req.body.endTime);
        const convertedStartTimeNew = startTimeNew.toLocaleString("en-US", {timeZone: "Asia/Calcutta"});
        const convertedEndTimeNew = endTimeNew.toLocaleString("en-US", {timeZone: "Asia/Calcutta"});
        // console.log(convertedStartTimeNew,convertedEndTimeNew)
        
        let  interview = {
            startTime:startTimeNew,
            endTime:endTimeNew
        }
        const busyPaticipants = [];
        let participants;
     
        participants= await Participants.find({_id:{$in:req.body.participants}}).populate("scheduledInterviews","startTime endTime").exec();
        
        for(let i=0;i<=participants.length-1;i++){
                try{
                     participants[i].checkClash(startTimeNew,endTimeNew);
                    }catch(e){
                        console.log(e);
                     busyPaticipants.push(participants[i])
                }
           }
        if(busyPaticipants.length!=0) throw new Error('participants are busy!')
        
        let interviewObj = await Interview.create(interview);
    
        //sending emails!
        const interviewTransformed={};
        interviewTransformed.participants = [];

        participants.forEach(async p=>{
           serverClient.sendEmail({
            "From": "chinthamvishal.2019@vitstudent.ac.in",
            "To": p.email,
            "Subject": "INTERVIEW Timings",
            "HtmlBody": `<h1>Your Interview is scheduled from ${convertedStartTimeNew} to ${convertedEndTimeNew} </h1>`,
            "TextBody": "Your Interview is scheduled from ${startTimeNew} to ${endTimeNew} ",
            "MessageStream": "outbound"
              });
            p.scheduledInterviews.push(interviewObj);
            await p.save();
            interviewTransformed.participants.push({email:p.email,name:p.name})
           })
        interviewObj["participants"]=req.body.participants;
        await interviewObj.save()

        interviewTransformed.startTime = interviewObj.startTime.toLocaleString("en-US", {timeZone: "Asia/Calcutta"});
        interviewTransformed.endTime = interviewObj.endTime.toLocaleString("en-US", {timeZone: "Asia/Calcutta"});
        interviewTransformed._id = interviewObj._id
        res.status(200).send({
            interview:interviewTransformed
        })
    
       }catch(e){
           errorMessage = {
               error:e.toString()
           }
           if(e.toString()==="Error: participants are busy! "){
              errorMessage[busyPaticipants]=busyPaticipants
           }
           console.log(e)
           res.status(400).send(errorMessage)
       }
}


// if(req.body.participants && req.body.participants.length<2) throw new Error("Minimum of 2 participants must be selected!")
// const id = req.params.id.trim();
// const interview = await Interview.findById(id).exec();
// const startTimeNew = new Date(req.body.startTime);
// const endTimeNew = new Date(req.body.endTime);
// const convertedStartTimeNew = startTimeNew.toLocaleString("en-US", {timeZone: "Asia/Calcutta"});
// const convertedEndTimeNew = endTimeNew.toLocaleString("en-US", {timeZone: "Asia/Calcutta"});
// let removedParticipants = [];
// let rescheduledParticipants = [];
// let index
// const busyPaticipants = [];
// let oldParticipants = interview.participants;
// let newParticipants = req.body.participants;
// if(req.body.participants){

// for(let i=0;i<=oldParticipants.length-1;i++){
//     index=newParticipants.findIndex(p=>p==oldParticipants[i].toString())
//     if(index===-1){
//         removedParticipants.push(oldParticipants[i]);
//         interview.participants.splice(i,1);
//     }else{
//         rescheduledParticipants.push(oldParticipants[i]);
//         newParticipants.splice(index,1);
//     }
// }


// if(newParticipants.length>0){
//     newParticipants= await Participants.find({_id:{$in:newParticipants}}).populate("scheduledInterviews","startTime endTime");
//     for(let i=0;i<=newParticipants.length-1;i++){
//         try{
//              newParticipants[i].checkClash(startTimeNew,endTimeNew);
//             }catch(e){
//              busyPaticipants.push(newParticipants[i])
//         }
//     }
   

// }

// if(removedParticipants.length!=0){

//     for(let i=0;i<=removedParticipants.length-1;i++){
//         removedParticipants[i]=await Participants.findById(removedParticipants[i]);

//               index=removedParticipants[i].scheduledInterviews.findIndex(i=>i._id.toString()===interview._id.toString());
//               removedParticipants[i].scheduledInterviews    .splice(index,1);
//               await removedParticipants[i].save()
              
//         }

        
//     }
//     newParticipants.forEach(async p=>{
//         serverClient.sendEmail({
//                  "From": "chinthamvishal.2019@vitstudent.ac.in",
//                  "To": p.email,
//                  "Subject": "INTERVIEW Timings",
//                  "HtmlBody": `<h1>Your Interview is scheduled from ${convertedStartTimeNew} to ${convertedEndTimeNew} </h1>`,
//                  "TextBody": "Your Interview is scheduled from ${startTimeNew} to ${endTimeNew} ",
//                  "MessageStream": "outbound"
//                    });
//                  p.scheduledInterviews.push(interview);
//                  await p.save();
//                  interview.participants.push(p);
//                 })

// rescheduledParticipants = await Participants.find({_id:{$in:rescheduledParticipants}}).populate('scheduledInterviews');
// }else{
// rescheduledParticipants = await Participants.find({_id:{$in:interview.participants}}).populate('scheduledInterviews');
// }

// if(rescheduledParticipants.length!=0){
//     for(let i=0;i<=rescheduledParticipants.length-1;i++){
//         try{
//             rescheduledParticipants[i].checkClash(startTimeNew,endTimeNew,interview._id);
//            }catch(e){
//                console.log(e);
//             busyPaticipants.push(rescheduledParticipants[i])
//        }
//    }
//    if(busyPaticipants.length!=0) throw new Error('participants are busy!')
   
//    for(let i=0;i<=rescheduledParticipants.length-1;i++){

//     }
//         //handling removed participants

// console.log("**************88",interview)
// interview.startTime=startTimeNew;
// console.log(typeof startTimeNew,typeof endTimeNew)
// interview.endTime=endTimeNew;
// await interview.save();
// const interviewTransformed={};
// interviewTransformed.startTime = interview.startTime.toLocaleString("en-US", {timeZone: "Asia/Calcutta"});
// interviewTransformed.endTime = interview.endTime.toLocaleString("en-US", {timeZone: "Asia/Calcutta"});
// interviewTransformed.participants = [];
// interviewTransformed._id = interview._id
// rescheduledParticipants.forEach(p=>{
//     interviewTransformed.participants.push({email:p.email,name:p.name})
// })
// if(newParticipants){
//     newParticipants.forEach(p=>{
//         interviewTransformed.participants.push({email:p.email,name:p.name})
//     })
// }
const updateInterview = async (req,res)=>{
    try{
        if(req.body.participants && req.body.participants.length<2) throw new Error("Minimum of 2 participants must be selected!");
        const id = req.params.id.trim();
        const interview = await Interview.findById(id);
        const startTimeNew = new Date(req.body.startTime);
        const endTimeNew = new Date(req.body.endTime);
        const checkEqual = (startTimeNew.getTime()===interview.startTime.getTime() && endTimeNew.getTime()===interview.endTime.getTime()) ? 1 : 0 ;
        console.log(interview.participants)
        oldParticipants=[...interview.participants];
        //stores indices
    
        let rescheduledOrOld = [];
        let newParticipants = req.body.participants;
        let index=-1;

        //checking the old participants who have been removed
        newParticipants.forEach(n=>{
            index=oldParticipants.findIndex(o=>{
                return o.toString()===n.toString()
            }
                );
            
            if(index!==-1){
                rescheduledOrOld.push(n);
                oldParticipants.splice(index,1);
            }
        })
       // console.log(oldParticipants,)
        if(oldParticipants.length===interview.participants.length && checkEqual)throw new Error("No changes for the interview") 

        //removing the old ones


        let busyPaticipants = [];
        //formatting the time for sending it in response!
        const convertedStartTimeNew = startTimeNew.toLocaleString("en-US", {timeZone: "Asia/Calcutta"});
        const convertedEndTimeNew = endTimeNew.toLocaleString("en-US", {timeZone: "Asia/Calcutta"});
        
        
        newParticipants = await Participants.find({_id:{$in:newParticipants}});
        newParticipants = newParticipants.filter(r=>{
            try{
                index = rescheduledOrOld.findIndex(o=>o===r._id.toString());
                if(index===-1){
                    r.checkClash(startTimeNew,endTimeNew)
                    return r;
                }
            }catch(e){
                console.log("from 251",e);
                busyPaticipants.push(r);
            }
        })

    
        
        if(busyPaticipants.length!=0) throw new Error("participants busy!!");
        
        //checking if rescheduling or not!
        if(!checkEqual){

            //checking if old participants are busy or not for new timings
            rescheduledOrOld = await Participants.find({_id:{$in:rescheduledOrOld}}).populate('scheduledInterviews').exec();
            rescheduledOrOld.forEach(r=>{
                try{
                    r.checkClash(startTimeNew,endTimeNew)
                }catch(e){
                    console.log("from 268",e);
                    busyPaticipants.push(r);
                }
            })
           
            if(busyPaticipants.length!=0) throw new Error("participants busy!!");

            rescheduledOrOld.forEach(r=>{
                serverClient.sendEmail({
                    "From": "chinthamvishal.2019@vitstudent.ac.in",
                    "To": r.email,
                    "Subject": "INTERVIEW has been rescheduled",
                    "HtmlBody": `<h1>Your Interview has been rescheduled and it is from ${convertedStartTimeNew} to ${convertedEndTimeNew}}</h1>`,
                    "TextBody": "Your Interview has been rescheduled and it is from ${startTimeNew} to ${endTimeNew}",
                    "MessageStream": "outbound"
                    });
            })
        }
        newParticipants.forEach(async n=>{
                serverClient.sendEmail({
                 "From": "chinthamvishal.2019@vitstudent.ac.in",
                 "To": n.email,
                 "Subject": "INTERVIEW Timings",
                 "HtmlBody": `<h1>Your Interview is scheduled from ${convertedStartTimeNew} to ${convertedEndTimeNew} </h1>`,
                 "TextBody": "Your Interview is scheduled from ${startTimeNew} to ${endTimeNew} ",
                 "MessageStream": "outbound"
                   });
                  n.scheduledInterviews.push(interview);
                  n = await n.save()
                  console.log(n)
                  console.log(interview.participants)
                  interview.participants.push(n)
                  console.log(interview.participants)
                })
        oldParticipants = await Participants.find({_id:{$in:oldParticipants}})
    
        oldParticipants.forEach(async o=>{
            o.scheduledInterviews=o.scheduledInterviews.filter(i=>i.toString()!==interview._id.toString());
            // sending them emails regarding the cancellation!
            serverClient.sendEmail({
                "From": "chinthamvishal.2019@vitstudent.ac.in",
                "To": o.email,
                "Subject": "INTERVIEW has been cancelled",
                "HtmlBody": `<h1>Your Interview scheduled from ${interview.startTime.toLocaleString("en-US", {timeZone: "Asia/Calcutta"})} to ${interview.endTime.toLocaleString("en-US", {timeZone: "Asia/Calcutta"})} has been cancelled! we will get back to you</h1>`,
                "TextBody": "Your Interview is scheduled from ${startTimeNew} to ${endTimeNew} has been cancelled! we will get back to you",
                "MessageStream": "outbound"
                  });
            await o.save();
            
            interview.participants.splice(interview.participants.findIndex(p=>p.toString()===o._id.toString()),1)

        });

        interview.startTime = startTimeNew;
        interview.endTime = endTimeNew;
        const interviewNew=await interview.save()
        await Interview.updateOne({_id:interview._id},interviewNew)

        
        



        res.status(200).send({
            interview: {
                startTime:convertedStartTimeNew,
                endTime:convertedEndTimeNew,
                participants:[...interview.participants]
            }
            })
    }catch(e){
        console.log(e)
        res.status(400).send(e)
    }

}



module.exports = {
   getInterviews,
   postInterview,
   updateInterview

}