<template>
  <div>
    <v-text-field v-model="numberOfRuns" label="Number of Runs" type="number" :rules="runRules"></v-text-field>
    <v-btn color="error" @click="simulate" :loading="simLoading" class="simulate-btn">ＳＩＭＵＬＡＴＥ</v-btn>
    <div v-if="results.length > 0">
      <v-data-table
        :headers="minionTableheaders"
        :items="results"
        :custom-sort="minionTableSort"
        sort-icon="fa-angle-up"
        class="elevation-1"
        disable-initial-sort
        hide-actions>
        <template slot="items" slot-scope="props">
          <tr :class="props.item.isEnemy === 0 ? 'friendly-minion': 'enemy-minion'">
            <td>{{ props.item.stats }} 
              <div class="emoji">
                {{ `${props.item.divineShield ? ' 🛡️': ''}` + `${props.item.poisonous ? ' ☠': ''}` }}
              </div>
            </td>
            <td class="text-xs-left">{{ Number(props.item.healthAfter.toFixed(2)) }}</td>
            <td class="text-xs-left">{{ Number((props.item.survival) * 100).toFixed(2) + '%' }}</td>
          </tr>
        </template>
      </v-data-table>
      <v-data-table
        :headers="boardTableHeaders"
        :items="boardStatistics"
        sort-icon="fa-angle-up"
        class="elevation-1"
        hide-actions
        disable-initial-sort
        id="board-table">
        <template slot="items" slot-scope="props">
          <tr :class="props.item.description === 'Your Board' ? 'friendly-minion': props.item.description === 'Enemy Board' ? 'enemy-minion': ''">
            <td>{{ props.item.description }}</td>
            <td>{{ Number((props.item.clearChance) * 100).toFixed(2) + '%' }}</td>
            <td>{{ props.item.remainingDamage !== undefined? Number(props.item.remainingDamage.toFixed(2)): '' }}</td>
          </tr>
        </template>
      </v-data-table>
    </div>
  </div>
</template>

<script>
const getMassHysteriaSim = () => import(/* webpackChunkName: "SimualtionCode" */ '../simulate.js')
import SimWorker from 'worker-loader!../sim.worker.js'
import PromiseWorker from 'promise-worker'

export default {
  data() {
    return {
      results: [],
      numberOfRuns: 10000,
      simLoading: false,
      worker: null,
      runRules: [
        r => r <= 10000000 || 'That\'s too many runs (Max: 10.000.000)'
      ],
      minionTableheaders: [
        {
          text: 'Minion',
          value: 'stats'
        },
        {
          text: 'Average health after',
          value: 'healthAfter'
        },
        {
          text: 'Chance of Survival',
          value: 'survival'
        },
      ],
      boardTableHeaders: [
        {
          text: '',
          value: 'description',
          sortable: false,
          divider: true,
          width: '182px'
        },
        {
          text: 'Chance to Clear',
          value: 'clearChance',
          width: '352px'
        },
        {
          text: 'Remaining Damage',
          value: 'remainingDamage'
        },
      ],
      boardTableDescription: [
        'Your Board',
        'Enemy Board',
        'Entire Board'
      ],
      boardStatistics: [],
    }
  },
  computed: {
    friendlyMinions: function () {
      return this.$store.state.friendlyMinions 
    },
    enemyMinions: function () {
      return this.$store.state.enemyMinions 
    },
  },
  methods: {
    async simulate() {
      if (Object.keys(this.enemyMinions).length === 0 && Object.keys(this.friendlyMinions).length === 0) {
        return this.$emit('error', 'Please add some minions : )')
      } else if (
        (Object.keys(this.enemyMinions).length === 1 && Object.keys(this.friendlyMinions).length === 0) ||
        (Object.keys(this.enemyMinions).length === 0 && Object.keys(this.friendlyMinions).length === 1)
      ) {
        return this.$emit('error', 'Nothing is going to happen : )')
      }
      this.simLoading = true

      const runs = parseInt(this.numberOfRuns)
      const friendlyMinions = Object.values(this.friendlyMinions).map(e => [e.a, e.h, 0, e.d ? 1: 0, e.p ? 1: 0]).flat()
      const enemyMinions = Object.values(this.enemyMinions).map(e => [e.a, e.h, 1, e.d ? 1: 0, e.p ? 1: 0]).flat()
      const minions = friendlyMinions.concat(enemyMinions).map(e => parseInt(e))
      try {
        const result = await this.callWorker(minions, runs)
        
        Object.assign(this, result)
        this.results = result.attack.map((e, i) => {
          return {
            stats: `${e}/${result.healthBefore[i]}`,
            healthAfter: result.healthAfter[i],
            survival: result.survival[i],
            isEnemy: result.isEnemy[i],
            divineShield: result.divineShield[i],
            poisonous: result.poisonous[i]
          }
        })

        this.boardStatistics = new Array(3)
        for (let i = 0; i < this.boardStatistics.length; i++) {
          this.boardStatistics[i] = {
            description: this.boardTableDescription[i],
            clearChance: this.clearChance[i],
            remainingDamage: this.remainingDamage[i]
          }
        }
      } catch (e) {
        this.$emit('error', e.message)
      }
      this.simLoading = false
    },
    callWorker (minions, runs) {
      if (this.worker)
        return this.worker.postMessage({
          type: 'simulate',
          minions,
          runs
        })
      else {
        
      }
    },
    minionTableSort (minions, header, isDescending) {
      const sortAscDesc = (isDescending, attr) => {
        const sortAsc = (a, b) => a[attr] - b[attr]
        const sortDesc = (a, b) => b[attr] - a[attr]
        return isDescending ? sortDesc : sortAsc
      }

      function sortMinionsAscDesc (isDescending) {
        const factor = isDescending ? -1 : 1
        return (a, b) => {
          if (a.isEnemy === b.isEnemy) {
            return 0
          } else if (a.isEnemy && !b.isEnemy) {
            return 1 * factor
          } else if (!a.isEnemy && b.isEnemy) {
            return -1 * factor
          }
        }
      }

      switch (header) {
        case 'stats':
          return minions.sort(sortMinionsAscDesc(isDescending))
        case 'healthAfter':
          return minions.sort(sortAscDesc(isDescending, 'healthAfter'))
        case 'survival':
          return minions.sort(sortAscDesc(isDescending, 'survival'))
        default:
          break
      }
      return minions
    }
  },
  created () {
    const worker = new SimWorker('../sim.worker.js')
    this.worker = new PromiseWorker(worker)
  },
  mounted () {
    if (Object.keys(this.friendlyMinions).length > 0 || Object.keys(this.enemyMinions).length > 0) {
      this.simulate()
    }
  }
}
</script>

<style>
  .v-table__overflow {
    margin-top: 20px;
  }

  .important-results {
    padding-top: 20px;
    font-size: 0.8em;
  }
</style>
