import React from 'react';
import RaisedButton from 'material-ui/RaisedButton';
import {GridList, GridTile} from 'material-ui/GridList';
import IconButton from 'material-ui/IconButton';
import Subheader from 'material-ui/Subheader';
import StarBorder from 'material-ui/svg-icons/toggle/star-border';

const styles = {
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  gridList: {
    width: 1000,
    height: 850,
    overflowY: 'auto',
  },
};

const tilesData = [
  {
    img: 'http://cdn-image.foodandwine.com/sites/default/files/201111-xl-liege-waffles.jpg',
    title: 'Liege Waffles',
    description: 'description',
  },
  {
    img: 'https://static1.squarespace.com/static/50a43af2e4b013b04b877d4e/50a48341e4b06eecde88101c/50c183d0e4b08bba8489d091/1434199989721/_MG_9865.jpg',
    title: 'Liege Waffles',
    description: 'description',
  },
  {
    img: 'https://www.sweetashoney.co/wp-content/uploads/DSC_0081.jpg',
    title: 'Liege Waffles',
    description: 'description',
  },
  {
    img: 'http://1.bp.blogspot.com/-Zg0XbmBG-NI/VCnq3KYS5RI/AAAAAAAAG1s/ri7467hdlKA/s1600/waffle%2Bcover%2BREVISED.jpg',
    title: 'Liege Waffles',
    description: 'description',
  },
  {
    img: 'http://www.europeancuisines.com/sites/default/files/Liege_Waffles_Plated_Up.jpg',
    title: 'Liege Waffles',
    description: 'description',
  },
  {
    img: 'https://2.bp.blogspot.com/-gvWAv7FO6wI/Vthl0_-QzUI/AAAAAAAAQ8U/CT20sQq_zJc/s1600/DSC_5768.JPG',
    title: 'Liege Waffles',
    description: 'description',
  },
  {
    img: 'https://foodydoody.files.wordpress.com/2015/09/dsc_5130.jpg',
    title: 'Liege Waffles',
    description: 'description',
  },
  {
    img: 'http://4.bp.blogspot.com/-Yz0eHsyFtLI/VP5dcZrAMyI/AAAAAAAAPLk/-s2uDvuVlEo/s1600/Caramelized%2BWaffles%2B(Liege%2BWaffles)%2B2.jpg',
    title: 'Liege Waffles',
    description: 'description',
  },
];

const PhotoGrid = () => {
  return (
<div className="container photogrid">
  <h1>Photo Grid</h1>
  <div style={styles.root}>
    <GridList cellHeight={280} style={styles.gridList}>
      <Subheader>Food</Subheader>
      {tilesData.map((tile) => (
      <GridTile key={tile.img} title={tile.title} subtitle={<span><b>{tile.description}</b></span>} actionIcon={
        <IconButton>
          <StarBorder color="white" />
        </IconButton>} >
        <img src={tile.img} />
      </GridTile>
      ))}
    </GridList>
  </div>
</div>

  )
}

export default PhotoGrid;
