WEIGHTS={'power_energy':.35,'water':.15,'policy_regulatory_environment':.25,'community_sentiment':.25}
def validate(state):
 scores=state['scores']
 assert set(scores)==set(WEIGHTS)
 assert all(1<=float(v)<=5 and float(v)*2==int(float(v)*2) for v in scores.values())
 computed=round(sum(float(scores[k])*w for k,w in WEIGHTS.items())*20,1)
 assert abs(computed-float(state['overall_score']))<=.11,(state['abbr'],computed,state['overall_score'])
