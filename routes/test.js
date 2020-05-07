function wahsCharacter(a){
        var stard = 0
        var radius = 200
        var avd = 360 / a
        var ahd = avd * Math.PI / 180
        for (let i = 0; i < a; i++) {

         console.log( Math.sin((ahd * i)) * radius )
         console.log( Math.cos((ahd * i)) * radius )
        }
}




wahsCharacter(4)