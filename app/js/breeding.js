function jaccard(itemset1,itemset2)
{
	var union,intersection;
	union = unite(itemset1,itemset2);
	intersection = intersect(itemset1,itemset2);
	return intersection.length/union.length;
}

function unite(itemset1,itemset2)
{
	var union = itemset1.slice(0);
	for(item in itemset2)
	{
		if(union.indexOf(itemset2[item]) == -1)
			union.push(itemset2[item]);
	}
	return union;
}

function intersect(itemset1,itemset2)
{
	var intersection = [];
	for(item in itemset1)
	{
		if(itemset2.indexOf(itemset1[item]) != -1)
		{
			console.log(itemset1[item])
			intersection.push(itemset1[item]);
		}
	}
	return intersection;
}