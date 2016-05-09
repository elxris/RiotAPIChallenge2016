/* node:false, browser:true, strict:false */

$('.button-collapse').sideNav({
  menuWidth: 300, // Default is 240
  edge: 'right', // Choose the horizontal origin
});
$('.collapsible').collapsible();

//*** APP ***
new Vue({
  el: '#app',
  data: {
    name: '',
    region: '',
    regions: ['BR','EUNE','EUW','JP','KR','LAN','LAS','NA','OCE','RU','TR'],
    userData: '',
    recentGames: '',
    actionCount: 0
  },
  computed: {
    profileIcon: function() {
      var base = 'http://ddragon.leagueoflegends.com/' +
                 'cdn/6.9.1/img/profileicon/';
      return base + ((this.userData || {}).profileIconId || 588) + '.png';
    }
  },
  watch: {
    'region': function(val) {
      console.log(val);
      localStorage.setItem('region', val);
      this.obtainData();
    },
    'name': function(val) {
      console.log(val);
      localStorage.setItem('name', val);
      this.obtainData();
    }
  },
  created: function() {
    this.region = localStorage.getItem('region');
    this.name   = localStorage.getItem('name');
  },
  methods: {
    obtainData: function() {
      if (!(this.actionCount++)) {
        return;
      }
      var self = this;
      if (this.region && this.name) {
        self.userData = '';
        $.post('/api/summoner',
          {
            name: this.name.split(/\s/g).join('').toLowerCase(),
            region: this.region
          },
          function(data) {
            self.userData = data;
            console.log(data);
          }
        ).fail(function() {
          self.userData = '';
        });
      }
    },
    loadRecentGames: function() {
      if (this.region && this.userData.summonerId) {
        self.recentGames = '';
        $.post('/api/recent-games',
          {
            summoner: this.userData.summonerId,
            region: this.region
          },
          function(data) {
            self.recentGames = data;
            console.log(data);
          }
        ).fail(function() {
          self.recentGames = '';
        });
      }
    }
  }
});
