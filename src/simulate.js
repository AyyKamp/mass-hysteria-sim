/***
 * Stats:
 * 0: Attack
 * 1: Health
 * 2: Enemy (0 = Friendly, 1 = Enemy)
 * 3: Divine Shield
 * 4: Poisonous
*/

const shuffle = array => {
  let currentIndex = array.length, temporaryValue, randomIndex

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }

  return array
}

// a remake of the sample function that prevents sample(x)=sample(1:x) when length(x)=1
const mysample = (x) => {
  if (x.length > 1) {
    return shuffle(x)
  } else {
    return x
  }
}

// Create list from 0 to n-1
const range = n => {
  return Array.from(Array(n).keys())
}

// Create a 2D array
const matrix = (arr, ncol, byrow) => {
  const result = []
  for (let i = 0; i < arr.length / ncol; i++) {
    const row = []
    for (let j = 0; j < ncol; j++) {
      if (byrow) {
        row.push(arr[i * ncol + j])
      } else {
        row.push(arr[i + ncol * j])
      }
    }
    result.push(row)
  }
  return result
}
// Create a filled 3D array
const arr3D = (fillVal, dim1, dim2, dim3) => {
  let result = []
  for (let i = 0; i < dim1; i++) {
    const row = []
    for (let j = 0; j < dim2; j++) {
      row.push(new Array(dim3).fill(fillVal))
    }
    result.push(row)
  }
  return result
}

// simulate an attack
const attack = (self, victim) => {
  resolveMinion(self, victim)
  resolveMinion(victim, self)
}

// resolve an attack for one minion, taking into consideration divine shield and poisonous
const resolveMinion = (self, victim) => {
  // if minion has divine shield and attacker has at least 1 attack, 
  // take no damage and remove divine shield
  if (self[3] === 1 && victim[0] >= 1) {
    self[3] = 0
  }
  // if victim has poisonous and at least 1 attack, die 
  else if (victim[4] === 1 && victim[0] >= 1) {
    self[1] = 0
  }
  // if none of the previous apply, take normal damage
  else {
    self[1] -= victim[0]
  }
}

// Mass hysteria simulation function:
// Input: vector of initial stats of minions and which side of the board they are on: 
// 0 = your side, 1 = opponent's side
// i.e. (attack1, health1, side1, attack2, health2, side 2,...)
// Output: matrix of stats of minions after mass hysteria has been cast
const massHysteria = boardStats => {
  const n = boardStats.length / 5
  let stats = matrix(boardStats, 5, true)
  const order = mysample(range(n))
  // for each minion
  for (let i = 0; i < n; i++) {
    // Choose attacker
    const attacker = order[i]
    // Check if attacker is alive    
    if (stats[attacker][1] > 0) {
      // Create a list of possible attackees
      // They can't be the attacker
      let attackee = mysample(range(n).filter(v => v !== attacker))
      // They must be alive
      attackee = attackee.filter(p => {
        return stats[p][1] > 0
      })
      if (attackee.length > 0) {
        // choose one
        attackee = attackee[0]
        // and then attack it
        attack(stats[attacker], stats[attackee])
      }
    }
  }
  return stats
}

// Multiple trials of mass hysteria
// Input: minions' initial stats & posistion and number of trials
// Output: mean stats left on board and proportion of trials in which every 
// minion dies (a full board clear)
const testMassHysteria = (stats, trials) => {

  const n = stats.length / 5
  if (n % 1 !== 0) {
    return 'Invalid Minion Stats.'
  } else {
    const statsMat = matrix(stats, 5, true)
    // Values for Chart at end
    const attack = []
    const healthBefore = []
    const isEnemy = []
    const divineShield = []
    const poisonous = []
    for (let i = 0; i < statsMat.length; i++) {
      attack.push(statsMat[i][0])
      healthBefore.push(statsMat[i][1])
      isEnemy.push(statsMat[i][2])
      divineShield.push(statsMat[i][3])
      poisonous.push(statsMat[i][4])
    }

    const survival = new Array(n).fill(0)
    // Create 3D array to house the trials
    let simStats = arr3D(0, n, 5, trials)
    
    let cleared = new Array(3)
    cleared[0] = new Array(trials).fill(1)
    cleared[1] = new Array(trials).fill(1)
    cleared[2] = new Array(trials).fill(1)
    
    // for each trial
    for (let trial = 0; trial < trials; trial++) {
      // do the trial and put it in the array
      for (let i = 0; i < simStats.length; i++) {
        simStats[i][2][trial] = statsMat[i][2]
      }
      const trialResult = massHysteria(stats)
      for (let i = 0; i < simStats.length; i++) {
        for (let j = 0; j < simStats[0].length; j++) {
          simStats[i][j][trial] = trialResult[i][j]
        }
      }
      
      //old
      /* for (let i = 0; i < simStats.length; i++) {
        survival[i] = survival[i] + (simStats[i][1][trial] > 0 ? 1 / trials : 0)
        // see whether or not the trial resulted in a full clear of enemy board
        if (simStats[i][1][trial] * simStats[i][2][trial] > 0.05) {
          cleared[trial] = 0
        }
      } */
      //new
      // Get each minion's chance of survival and the chance of clearing the enemy's board
      for (let i = 0; i < simStats.length; i++) {
        survival[i] = survival[i] + (simStats[i][1][trial] > 0 ? 1 / trials : 0)
        // see whether or not the trial resulted in a full clear of enemy board
        
        /* if (simStats[i][2][trial] === 0 && simStats[i][1][trial] > 0.05)
          cleared[0][trial] = 0
        if (simStats[i][2][trial] === 1 && simStats[i][1][trial] > 0.05)
          cleared[1][trial] = 0
        if (simStats[i][1][trial] > 0.05)
          cleared[2][trial] = 0 */

        if (simStats[i][1][trial] > 0 && simStats[i][2][trial] === 0) {
          cleared[0][trial] = 0
        }
        if (simStats[i][1][trial] > 0 && simStats[i][2][trial] === 1) {
          cleared[1][trial] = 0
        }
        if (cleared[0][trial] === 0 || cleared[1][trial] === 0) {
          cleared[2][trial] = 0
        }
      }
    }
    const healthAfter = []
    for (let i = 0; i < simStats.length; i++) {
      let healthSum = 0
      for (let j = 0; j < trials; j++) {
        healthSum += simStats[i][1][j]
      }
      healthAfter.push(healthSum / trials)
    }

    const clearChance = new Array(3)
    for (let i = 0; i < clearChance.length; i++) {
      clearChance[i] = cleared[i].reduce((curr, next) => curr + next) / cleared[i].length
    }

    const remainingDamage = new Array(2).fill(0)
    for (let i in attack) {
      remainingDamage[isEnemy[i]] += attack[i] * survival[i]
    }

    // Printing it out and formatting numbers.
    // Remove the formatting if you want to do calculations on these
    // console.log("attack: ", attack);
    // console.log("healthBefore: ", healthBefore);
    // console.log("healthAfter: ", healthAfter.map(x => Number(x.toFixed(2))));
    // console.log("survival: ", survival.map(x => Number(x.toFixed(2))));
    // console.log("isEnemy: ", isEnemy);
    // console.log("clearChance: ", 100*clearChance.toFixed(4));
    // console.log("remainingDamage: ", remainingDamage.toFixed(2));
    return {
      attack,
      healthBefore,
      healthAfter,
      survival,
      isEnemy,
      clearChance,
      remainingDamage,
      divineShield,
      poisonous
    }
  }
}

export default testMassHysteria
